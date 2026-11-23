import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { imageSize } from 'image-size';
import type {
  AdminCourse,
  AdminCourseCategoryOption,
  AdminCourseDetail,
  AdminCourseDomainOption,
  CourseImageUploadResult,
  CourseTechnology,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SupabaseAdminService } from '../../common/supabase-admin/supabase-admin.service';
import { mapBadge, mapLevel, unmapBadge, unmapLevel } from '../courses/catalogue.mappers';
import type { CourseInputDto } from './dto/admin-course.dto';

const COURSE_COVER_BUCKET = 'blog-media';
/**
 * Every course card/detail page renders this image at the same 16:9 box
 * (course-card.css, course-detail.css) -- a mismatched source image doesn't
 * get cropped to fit, it just looks visibly inconsistent next to every other
 * course's cover (see the three MBA course covers this was fixed for,
 * 2026-11-23). Enforced here, not just as a frontend hint, since an admin
 * upload is the one place a wrong-sized image could enter the catalogue
 * going forward.
 */
const REQUIRED_COVER_WIDTH = 1600;
const REQUIRED_COVER_HEIGHT = 900;

/** Which instructors teach which course. Drives generated timetables' host and (later) the instructor portal's roster. Also the full course editor: create/update/delete and the cover-image upload the editor's form uses. */
@Injectable()
export class AdminCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  /** Every non-deleted course, draft included -- not just published, so a newly-created draft is still easy to find and finish editing from this same screen. */
  async list(): Promise<AdminCourse[]> {
    const courses = await this.prisma.course.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        _count: { select: { enrollments: { where: { status: { not: 'cancelled' } } } } },
        instructors: { select: { instructorId: true } },
      },
      orderBy: { title: 'asc' },
    });
    const ids = [...new Set(courses.flatMap((c) => c.instructors.map((i) => i.instructorId)))];
    const profiles = ids.length
      ? await this.prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    return courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      status: c.status,
      enrolled: c._count.enrollments,
      instructors: c.instructors.map((i) => ({ id: i.instructorId, name: names.get(i.instructorId) ?? null })),
    }));
  }

  /** Replaces the whole set of instructors for a course. Only active instructor accounts can be assigned. */
  async setInstructors(adminId: string, courseId: string, instructorIds: string[]): Promise<AdminCourse> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true, title: true } });
    if (!course) throw new NotFoundException('Course not found.');

    const unique = [...new Set(instructorIds)];
    if (unique.length > 0) {
      const valid = await this.prisma.profile.count({ where: { id: { in: unique }, role: 'instructor', status: 'active' } });
      if (valid !== unique.length) {
        throw new BadRequestException('Every selected person must be an active instructor.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.courseInstructor.deleteMany({ where: { courseId } }),
      this.prisma.courseInstructor.createMany({
        data: unique.map((instructorId) => ({ courseId, instructorId, assignedBy: adminId })),
      }),
    ]);
    // Classes generated before anyone was assigned have no host -- give them the first
    // instructor now so they are not left unstaffed. Classes that already have a host are untouched.
    if (unique.length > 0) {
      const now = new Date();
      await this.prisma.liveClass.updateMany({
        where: { courseId, hostUserId: null, status: 'scheduled', startsAt: { gt: now } },
        data: { hostUserId: unique[0] },
      });
      await this.prisma.timetable.updateMany({ where: { courseId, hostUserId: null }, data: { hostUserId: unique[0] } });
    }
    await this.audit.record(adminId, 'course.set_instructors', 'course', courseId, { course: course.title, count: unique.length });

    const all = await this.list();
    return all.find((c) => c.id === courseId) as AdminCourse;
  }

  async listCategories(): Promise<AdminCourseCategoryOption[]> {
    const rows = await this.prisma.courseCategory.findMany({ orderBy: { name: 'asc' } });
    return rows.map((c) => ({ id: c.id, name: c.name, domainId: c.domainId }));
  }

  async listDomains(): Promise<AdminCourseDomainOption[]> {
    const rows = await this.prisma.courseDomain.findMany({ orderBy: { name: 'asc' } });
    return rows.map((d) => ({ id: d.id, slug: d.slug, name: d.name }));
  }

  /** Any status, not just published -- the editor needs to load a draft back for further editing. */
  async detail(id: string): Promise<AdminCourseDetail> {
    const row = await this.findOrThrow(id);
    return this.toDetail(row);
  }

  async create(adminId: string, dto: CourseInputDto): Promise<AdminCourseDetail> {
    const categoryId = await this.resolveCategoryId(dto.categoryName);
    await this.validateDomainId(dto.domainId);
    const row = await this.prisma.course
      .create({ data: toCourseData(dto, categoryId), ...DETAIL_INCLUDE })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') throw new ConflictException('A course with that slug already exists.');
        throw err;
      });
    await this.audit.record(adminId, 'course.create', 'course', row.id, { slug: row.slug, title: row.title });
    return this.toDetail(row);
  }

  async update(adminId: string, id: string, dto: CourseInputDto): Promise<AdminCourseDetail> {
    await this.findOrThrow(id);
    const categoryId = await this.resolveCategoryId(dto.categoryName);
    await this.validateDomainId(dto.domainId);
    const row = await this.prisma.course
      .update({ where: { id }, data: toCourseData(dto, categoryId), ...DETAIL_INCLUDE })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') throw new ConflictException('A course with that slug already exists.');
        throw err;
      });
    await this.audit.record(adminId, 'course.update', 'course', id, { slug: row.slug, title: row.title });
    return this.toDetail(row);
  }

  /** Soft delete only, same reasoning as every other catalogue-facing row here -- enrolled students keep their own enrollment/certificate records, this just removes the course from the public catalogue and admin "add instructors" list. */
  async remove(adminId: string, id: string): Promise<void> {
    const row = await this.findOrThrow(id);
    await this.prisma.course.update({ where: { id }, data: { deletedAt: new Date(), status: 'draft' } });
    await this.audit.record(adminId, 'course.delete', 'course', id, { slug: row.slug, title: row.title });
  }

  /**
   * Reads the real pixel dimensions from the uploaded bytes (never trust a
   * client-reported width/height) and rejects anything that doesn't match
   * the catalogue's one fixed cover size before it ever reaches storage --
   * see REQUIRED_COVER_WIDTH/HEIGHT's own comment for why this matters.
   * Storage itself reuses the blog editor's existing public bucket under
   * its own prefix, rather than standing up a second bucket for one more
   * image type.
   */
  async uploadCoverImage(file: Express.Multer.File): Promise<CourseImageUploadResult> {
    let dimensions: { width?: number; height?: number };
    try {
      dimensions = imageSize(file.buffer);
    } catch {
      throw new BadRequestException('Could not read that file as an image.');
    }
    const { width, height } = dimensions;
    if (!width || !height) {
      throw new BadRequestException('Could not read that image\'s dimensions.');
    }
    if (width !== REQUIRED_COVER_WIDTH || height !== REQUIRED_COVER_HEIGHT) {
      throw new UnsupportedMediaTypeException(
        `Course covers must be exactly ${REQUIRED_COVER_WIDTH}x${REQUIRED_COVER_HEIGHT}px (this one is ${width}x${height}px).`,
      );
    }
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `courses/${randomUUID()}.${ext}`;
    await this.supabase.uploadToStorage(COURSE_COVER_BUCKET, key, file.buffer, file.mimetype);
    const base = process.env.SUPABASE_URL ?? '';
    return { url: `${base}/storage/v1/object/public/${COURSE_COVER_BUCKET}/${key}`, width, height };
  }

  /** Finds an existing CourseCategory by name (case-insensitive) or creates one -- same convention prisma/seed.ts uses, so the editor never needs its own "manage categories" screen. */
  private async resolveCategoryId(name: string): Promise<string> {
    const trimmed = name.trim();
    const existing = await this.prisma.courseCategory.findFirst({ where: { name: { equals: trimmed, mode: 'insensitive' } } });
    if (existing) return existing.id;
    const created = await this.prisma.courseCategory.create({ data: { name: trimmed } });
    return created.id;
  }

  private async validateDomainId(domainId: string | null | undefined): Promise<void> {
    if (!domainId) return;
    const exists = await this.prisma.courseDomain.findUnique({ where: { id: domainId }, select: { id: true } });
    if (!exists) throw new BadRequestException('Unknown domain.');
  }

  private async findOrThrow(id: string) {
    const row = await this.prisma.course.findFirst({ where: { id, deletedAt: null }, ...DETAIL_INCLUDE });
    if (!row) throw new NotFoundException('Course not found.');
    return row;
  }

  private toDetail(row: Prisma.CourseGetPayload<typeof DETAIL_INCLUDE>): AdminCourseDetail {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      domainId: row.domainId,
      catalogueCategory: (row.catalogueCategory as AdminCourseDetail['catalogueCategory']) ?? null,
      technologies: (row.technologies as unknown as CourseTechnology[]) ?? [],
      summary: row.summary,
      description: row.description,
      priceUsdCents: row.priceUsdCents,
      priceWasUsdCents: row.priceWasUsdCents,
      pricing: row.pricing,
      level: mapLevel(row.level),
      durationHours: row.durationHours,
      durationLabel: row.durationLabel,
      badges: row.badges.map(mapBadge),
      instructorId: row.instructorId,
      image: row.image,
      outcomes: row.outcomes,
      requirements: row.requirements,
      audience: row.audience,
      toolsCovered: row.toolsCovered,
      certification: row.certification,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      enrolledCount: row._count.enrollments,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

const DETAIL_INCLUDE = {
  include: { category: { select: { name: true } }, _count: { select: { enrollments: { where: { status: { not: 'cancelled' } as const } } } } },
} satisfies Prisma.CourseDefaultArgs;

function toCourseData(dto: CourseInputDto, categoryId: string) {
  return {
    slug: dto.slug,
    title: dto.title,
    categoryId,
    domainId: dto.domainId ?? null,
    catalogueCategory: dto.catalogueCategory,
    technologies: dto.technologies as unknown as Prisma.InputJsonValue,
    summary: dto.summary,
    description: dto.description,
    priceUsdCents: dto.priceUsdCents,
    priceWasUsdCents: dto.priceWasUsdCents ?? null,
    pricing: dto.pricing,
    level: unmapLevel(dto.level),
    durationHours: dto.durationHours,
    durationLabel: dto.durationLabel,
    rating: 0,
    ratingCount: 0,
    badges: dto.badges.map(unmapBadge),
    // instructorId is deliberately untouched here -- see CourseInput's own
    // doc comment; omitting it from both create and update data leaves
    // Prisma to default it to null on create and leave it alone on update.
    image: dto.image,
    outcomes: dto.outcomes,
    requirements: dto.requirements,
    audience: dto.audience,
    toolsCovered: dto.toolsCovered,
    certification: dto.certification,
    status: dto.status,
    publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : dto.status === 'published' ? new Date() : null,
  };
}
