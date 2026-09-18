/**
 * The course catalogue's 9 top-level Categories -- shown above a course
 * title on cards/detail pages and used to drive the courses-page filter.
 * Hand-kept copy of the backend's own list (apps/api/src/modules/courses/
 * catalogue.mappers.ts's CATALOGUE_CATEGORY_NAMES) -- @aiit/shared is
 * types-only (no runtime export), same reason apps/api/prisma/seed-data's
 * domain/category files are their own hand-transformed copies of this
 * app's data/technologies.ts rather than a live cross-workspace import.
 */
export interface CatalogueCategory {
  slug: string;
  name: string;
}

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = [
  { slug: 'artificial-intelligence-intelligent-systems', name: 'Artificial Intelligence & Intelligent Systems' },
  { slug: 'data-science-analytics', name: 'Data Science & Analytics' },
  { slug: 'cloud-computing-devops', name: 'Cloud Computing & DevOps' },
  { slug: 'cybersecurity-networking', name: 'Cybersecurity & Networking' },
  { slug: 'emerging-advanced-computing', name: 'Emerging & Advanced Computing' },
  { slug: 'blockchain-web3', name: 'Blockchain & Web3' },
  { slug: 'digital-business-marketing', name: 'Digital Business & Marketing' },
  { slug: 'technology-management-business', name: 'Technology Management & Business' },
  { slug: 'foundation-digital-literacy', name: 'Foundation & Digital Literacy' },
];

export function getCatalogueCategoryName(slug: string | null | undefined): string {
  return CATALOGUE_CATEGORIES.find((c) => c.slug === slug)?.name ?? 'Technology';
}
