import type {
  CourseBadge as PrismaCourseBadge,
  CourseLevel as PrismaCourseLevel,
  CourseDomain as PrismaCourseDomain,
} from '@prisma/client';
import type { CourseBadge, CourseDomain, CourseLevel } from '@aiit/shared';

/** DB enum values are internal; these maps are the one place that translates them to the frontend's existing vocabulary. */
const LEVEL_MAP: Record<PrismaCourseLevel, CourseLevel> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All levels',
};

const BADGE_MAP: Record<PrismaCourseBadge, CourseBadge> = {
  featured: 'featured',
  new_badge: 'new',
  hot: 'hot',
  special: 'special',
  coming_soon: 'coming-soon',
};

export function mapLevel(level: PrismaCourseLevel): CourseLevel {
  return LEVEL_MAP[level];
}

export function mapBadge(badge: PrismaCourseBadge): CourseBadge {
  return BADGE_MAP[badge];
}

export function mapDomain(domain: PrismaCourseDomain): CourseDomain {
  return {
    id: domain.id,
    slug: domain.slug,
    name: domain.name,
    tagline: domain.tagline,
    summary: domain.summary,
    motif: domain.motif,
    order: domain.order,
    primary: domain.primary,
    image: domain.image,
  };
}
