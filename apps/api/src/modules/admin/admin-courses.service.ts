import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminCourse } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

/** Which instructors teach which course. Drives generated timetables' host and (later) the instructor portal's roster. */
@Injectable()
export class AdminCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminCourse[]> {
    const courses = await this.prisma.course.findMany({
      where: { status: 'published', deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
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
}
