import type {
  CourseBadge as PrismaCourseBadge,
  CourseLevel as PrismaCourseLevel,
  CourseDomain as PrismaCourseDomain,
} from '@prisma/client';
import type {
  CatalogueCategory,
  CatalogueCategorySlug,
  CourseBadge,
  CourseDomain,
  CourseLevel,
  CourseTechnology,
} from '@aiit/shared';

/** DB enum values are internal; these maps are the one place that translates them to the frontend's existing vocabulary. */
const LEVEL_MAP: Record<PrismaCourseLevel, CourseLevel> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All levels',
  absolute_beginner: 'Absolute Beginner',
  beginner_intermediate: 'Beginner–Intermediate',
  intermediate_advanced: 'Intermediate–Advanced',
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

/**
 * The catalogue's 9 top-level Category slugs -> display names. @aiit/shared
 * is types-only (no runtime export, see catalogue.ts), so this is a small
 * hand-kept copy -- matches apps/web/src/data/catalogueCategories.ts, same
 * convention as the CourseDomain/CourseCategory seed data being duplicated
 * between apps/api/prisma/seed-data and apps/web/src/data.
 */
const CATALOGUE_CATEGORY_NAMES: Record<CatalogueCategorySlug, string> = {
  'artificial-intelligence-intelligent-systems': 'Artificial Intelligence & Intelligent Systems',
  'data-science-analytics': 'Data Science & Analytics',
  'cloud-computing-devops': 'Cloud Computing & DevOps',
  'cybersecurity-networking': 'Cybersecurity & Networking',
  'emerging-advanced-computing': 'Emerging & Advanced Computing',
  'blockchain-web3': 'Blockchain & Web3',
  'digital-business-marketing': 'Digital Business & Marketing',
  'technology-management-business': 'Technology Management & Business',
  'foundation-digital-literacy': 'Foundation & Digital Literacy',
};

/**
 * `slug` is Course.catalogueCategory -- nullable (a course row this
 * migration didn't know about would have no value) and not guaranteed to
 * match the fixed list above if it's ever out of sync, so this never
 * throws: null/unrecognised falls back to a generic "Technology" label,
 * same fallback CourseCard used for a missing CourseDomain before.
 */
export function mapCatalogueCategory(slug: string | null): CatalogueCategory {
  if (!slug) return { slug: '' as CatalogueCategorySlug, name: 'Technology' };
  const name = CATALOGUE_CATEGORY_NAMES[slug as CatalogueCategorySlug];
  return name ? { slug: slug as CatalogueCategorySlug, name } : { slug: slug as CatalogueCategorySlug, name: slug };
}

/** Course.technologies is a loosely-typed Prisma Json column -- this is the one place that trusts its shape (set only by our own migrations/seed data, never by user input). */
export function mapTechnologies(value: unknown): CourseTechnology[] {
  return Array.isArray(value) ? (value as CourseTechnology[]) : [];
}
