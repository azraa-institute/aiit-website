export type CourseLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All levels'
  | 'Absolute Beginner'
  | 'Beginner–Intermediate'
  | 'Intermediate–Advanced';
export type CourseBadge = 'featured' | 'new' | 'hot' | 'special' | 'coming-soon';
export type PricingModel = 'paid' | 'free' | 'subscription';
export type DomainMotif =
  | 'lattice'
  | 'flow'
  | 'strata'
  | 'field'
  | 'horizon'
  | 'depth'
  | 'mesh'
  | 'signal';

/**
 * The catalogue's top-level "Category" (Artificial Intelligence & Intelligent
 * Systems, Cybersecurity & Networking, etc.) -- a fixed set of 9, shared by
 * the API (which stores just the slug on Course.catalogueCategory and
 * resolves the display name from this list) and the frontend (course
 * filters, search). Deliberately not the same concept as CourseDomain, which
 * is the older, decorative "technology domain" used for the homepage focus
 * rail and Plate motif art -- see the Course.catalogueCategory doc comment
 * in schema.prisma for why the two stayed separate.
 */
export type CatalogueCategorySlug =
  | 'artificial-intelligence-intelligent-systems'
  | 'data-science-analytics'
  | 'cloud-computing-devops'
  | 'cybersecurity-networking'
  | 'emerging-advanced-computing'
  | 'blockchain-web3'
  | 'digital-business-marketing'
  | 'technology-management-business'
  | 'foundation-digital-literacy';

export interface CatalogueCategory {
  slug: CatalogueCategorySlug;
  name: string;
}

// The 9 entries themselves are NOT exported as a runtime value here -- this
// package is types-only by design (see src/index.ts / package.json: no
// "main", only a "types" condition), so every existing import from
// '@aiit/shared' across both apps is `import type`. The actual
// slug->display-name list is duplicated in apps/api's catalogue.mappers.ts
// and apps/web's data/catalogueCategories.ts, same convention already used
// for CourseDomain/CourseCategory seed data (see seed-data/domains.ts's own
// "hand-transformed copy" comment).

/** "What you'll explore" -- a small, structured technology/tool/concept list per course, rendered on the course-detail page. Not hard-coded in the frontend: it belongs to the course record so it can be managed per programme. */
export type CourseTechnologyType = 'platform' | 'framework' | 'tool' | 'library' | 'language' | 'protocol' | 'concept';

export interface CourseTechnology {
  name: string;
  type: CourseTechnologyType;
  /** Key into the frontend's own restrained icon set (data/techIcons.tsx) -- never a third-party brand logo asset. */
  icon: string;
  /** 'core' (default when absent) vs 'optional' -- lets the detail page visually distinguish what the programme centers on from what it only touches. */
  tier?: 'core' | 'optional';
}

/**
 * Resolved price for one viewer. `usdCents`/`wasUsdCents` are the canonical
 * stored price; `amountCents`/`wasAmountCents` are that price converted to
 * `currency` (in `currency`'s own minor unit) for the request's resolved
 * location -- USD when no conversion applied. null mirrors a null usdCents
 * (members/subscription-only course).
 */
export interface PriceInfo {
  usdCents: number | null;
  wasUsdCents: number | null;
  amountCents: number | null;
  wasAmountCents: number | null;
  currency: string;
}

export interface CourseDomain {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  motif: DomainMotif;
  order: number;
  primary: boolean;
  image: string;
}

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  /** The Subcategory (course_categories.name) -- e.g. "Networking", "Cybersecurity", "Generative & Agentic AI". */
  categoryName: string;
  /** The catalogue's top-level Category -- what course cards show above the title. */
  catalogueCategory: CatalogueCategory;
  domain: CourseDomain | null;
  summary: string;
  price: PriceInfo;
  pricing: PricingModel;
  level: CourseLevel;
  durationHours: number;
  durationLabel: string;
  rating: number;
  ratingCount: number;
  enrolledCount: number;
  badges: CourseBadge[];
  instructorId: string | null;
  image: string;
  /** Sort key for "newest"/"oldest" listings; null for a course that hasn't been published. */
  publishedAt: string | null;
  /** "What you'll explore" -- structured, per-course technology/tool list. Included in the list shape too (not just detail) so a course card's small logo badges have something to pick from without a second fetch. */
  technologies: CourseTechnology[];
}

export interface CourseDetail extends CourseListItem {
  description: string;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  /** Superseded by `technologies` above for display -- kept for backward compatibility, no longer rendered. */
  toolsCovered: string[];
  certification: string;
}

export type CourseStatus = 'draft' | 'published';

/** GET /admin/courses/categories row -- an existing CourseCategory (the "Subcategory" picker in the course editor). */
export interface AdminCourseCategoryOption {
  id: string;
  name: string;
  domainId: string | null;
}

/** GET /admin/courses/domains row -- an existing CourseDomain, for the editor's optional "homepage rail" picker. */
export interface AdminCourseDomainOption {
  id: string;
  slug: string;
  name: string;
}

/**
 * GET /admin/courses/:id -- the admin editor's full detail shape,
 * independent of publish status (unlike the public CourseDetail above,
 * which only ever resolves a published, non-deleted row).
 */
export interface AdminCourseDetail {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryName: string;
  domainId: string | null;
  catalogueCategory: CatalogueCategorySlug | null;
  technologies: CourseTechnology[];
  summary: string;
  description: string;
  priceUsdCents: number | null;
  priceWasUsdCents: number | null;
  pricing: PricingModel;
  level: CourseLevel;
  durationHours: number;
  durationLabel: string;
  badges: CourseBadge[];
  instructorId: string | null;
  image: string;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  toolsCovered: string[];
  certification: string;
  status: CourseStatus;
  publishedAt: string | null;
  enrolledCount: number;
  createdAt: string;
}

/**
 * POST/PUT body for creating or updating a course. `categoryName` is a
 * free-text "Subcategory" -- the service finds an existing CourseCategory
 * by that name or creates one, same convention prisma/seed.ts already uses,
 * so the editor never needs its own "manage categories" screen.
 */
export interface CourseInput {
  slug: string;
  title: string;
  categoryName: string;
  domainId?: string | null;
  catalogueCategory: CatalogueCategorySlug;
  technologies: CourseTechnology[];
  summary: string;
  description: string;
  priceUsdCents: number | null;
  priceWasUsdCents?: number | null;
  pricing: PricingModel;
  level: CourseLevel;
  durationHours: number;
  durationLabel: string;
  badges: CourseBadge[];
  // Deliberately no instructorId here -- who teaches a course is managed
  // entirely by the existing AdminCoursesPage "Instructors" assignment
  // (CourseInstructor join table via PUT /admin/courses/:id/instructors),
  // not this content editor. Including it here would risk silently
  // clearing that assignment on every unrelated content save.
  image: string;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  toolsCovered: string[];
  certification: string;
  status: CourseStatus;
  publishedAt?: string | null;
}

/** POST /admin/courses/cover-image response -- the uploaded file's actual pixel dimensions, confirmed server-side. */
export interface CourseImageUploadResult {
  url: string;
  width: number;
  height: number;
}

export interface CurriculumLesson {
  slug: string;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
}

export interface CurriculumModule {
  title: string;
  order: number;
  lessons: CurriculumLesson[];
}
