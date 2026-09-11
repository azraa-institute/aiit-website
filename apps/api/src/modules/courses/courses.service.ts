import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CourseDetail,
  CourseDomain as SharedCourseDomain,
  CourseListItem,
  CurriculumModule,
  PriceInfo,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrencyService, type CurrencyRequestLike } from '../../common/currency/currency.service';
import { mapBadge, mapDomain, mapLevel } from './catalogue.mappers';

const COURSE_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: { select: { name: true } },
  domain: true,
  summary: true,
  priceUsdCents: true,
  priceWasUsdCents: true,
  pricing: true,
  level: true,
  durationHours: true,
  durationLabel: true,
  rating: true,
  ratingCount: true,
  enrolledCount: true,
  badges: true,
  image: true,
} satisfies Prisma.CourseSelect;

const COURSE_DETAIL_SELECT = {
  ...COURSE_LIST_SELECT,
  description: true,
  outcomes: true,
  requirements: true,
  audience: true,
  toolsCovered: true,
  certification: true,
  publishedAt: true,
} satisfies Prisma.CourseSelect;

type CourseListRow = Prisma.CourseGetPayload<{ select: typeof COURSE_LIST_SELECT }>;
type CourseDetailRow = Prisma.CourseGetPayload<{ select: typeof COURSE_DETAIL_SELECT }>;

const PUBLISHED_NOT_DELETED = { status: 'published', deletedAt: null } as const;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
  ) {}

  async list(request: CurrencyRequestLike): Promise<CourseListItem[]> {
    const currency = this.currency.resolveCurrency(request);
    const courses = await this.prisma.course.findMany({
      where: PUBLISHED_NOT_DELETED,
      select: COURSE_LIST_SELECT,
      orderBy: { publishedAt: 'desc' },
    });
    return Promise.all(courses.map((course) => this.toListItem(course, currency)));
  }

  async detail(slug: string, request: CurrencyRequestLike): Promise<CourseDetail> {
    const currency = this.currency.resolveCurrency(request);
    const course = await this.prisma.course.findFirst({
      where: { slug, ...PUBLISHED_NOT_DELETED },
      select: COURSE_DETAIL_SELECT,
    });
    if (!course) throw new NotFoundException('Course not found.');

    const item = await this.toListItem(course, currency);
    return {
      ...item,
      description: course.description,
      outcomes: course.outcomes,
      requirements: course.requirements,
      audience: course.audience,
      toolsCovered: course.toolsCovered,
      certification: course.certification,
      publishedAt: course.publishedAt ? course.publishedAt.toISOString() : null,
    };
  }

  async curriculum(slug: string): Promise<CurriculumModule[]> {
    const course = await this.prisma.course.findFirst({
      where: { slug, ...PUBLISHED_NOT_DELETED },
      select: {
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          select: {
            title: true,
            order: true,
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: { slug: true, title: true, summary: true, durationMinutes: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');
    return course.modules;
  }

  async listDomains(): Promise<SharedCourseDomain[]> {
    const domains = await this.prisma.courseDomain.findMany({ orderBy: { order: 'asc' } });
    return domains.map(mapDomain);
  }

  private async toListItem(course: CourseListRow | CourseDetailRow, currency: string): Promise<CourseListItem> {
    const price = await this.buildPriceInfo(course.priceUsdCents, course.priceWasUsdCents, currency);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      categoryName: course.category.name,
      domain: course.domain ? mapDomain(course.domain) : null,
      summary: course.summary,
      price,
      pricing: course.pricing,
      level: mapLevel(course.level),
      durationHours: course.durationHours,
      durationLabel: course.durationLabel,
      rating: course.rating.toNumber(),
      ratingCount: course.ratingCount,
      enrolledCount: course.enrolledCount,
      badges: course.badges.map(mapBadge),
      image: course.image,
    };
  }

  private async buildPriceInfo(
    usdCents: number | null,
    wasUsdCents: number | null,
    currency: string,
  ): Promise<PriceInfo> {
    if (usdCents === null) {
      return { usdCents: null, wasUsdCents: null, amountCents: null, wasAmountCents: null, currency };
    }

    const resolved = await this.currency.convert(usdCents, currency);
    const was = wasUsdCents !== null ? await this.currency.convert(wasUsdCents, resolved.currency) : null;

    return {
      usdCents,
      wasUsdCents,
      amountCents: resolved.amountCents,
      wasAmountCents: was ? was.amountCents : null,
      currency: resolved.currency,
    };
  }
}
