/* ============================================================
   AIIT DATA MODEL
   Every content type the platform renders. Presentation
   components consume these shapes only, swap this layer for a
   CMS / WordPress REST / LMS API without touching the UI.
   ============================================================ */

export type CourseLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All levels'
  | 'Absolute Beginner'
  | 'Beginner–Intermediate'
  | 'Intermediate–Advanced';

export type CourseStatus = 'featured' | 'new' | 'hot' | 'special' | 'coming-soon';

export type PricingModel = 'paid' | 'free' | 'subscription';

export interface TechnologyDomain {
  id: string;
  slug: string;
  name: string;
  /** One-line promise used on rails and cards. */
  tagline: string;
  /** Short editorial paragraph. */
  summary: string;
  /** Visual character keyword — drives accent + motion, not a whole new design. */
  motif: 'lattice' | 'flow' | 'strata' | 'field' | 'horizon' | 'depth' | 'mesh' | 'signal';
  /** Ordering weight; lower shows first. Six "primary" domains use 0–5. */
  order: number;
  primary: boolean;
  image: string;
  courseCategoryIds: string[];
}

export interface CourseCategory {
  id: string;
  name: string;
  domainId: string | null;
}

export interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  focus: string[];
  image?: string;
}

export interface CurriculumModule {
  title: string;
  lessons: number;
  topics: string[];
}

/** "What you'll explore" -- a structured technology/tool/concept entry on a course's detail page. Mirrors @aiit/shared's CourseTechnology. */
export interface CourseTechnology {
  name: string;
  type: 'platform' | 'framework' | 'tool' | 'library' | 'language' | 'protocol' | 'concept';
  /** Key into components/course/TechIcons.tsx's icon set. */
  icon: string;
  tier?: 'core' | 'optional';
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  /** The catalogue's top-level Category slug/name -- see data/catalogueCategories.ts. What CourseCard shows above the title. */
  catalogueCategorySlug: string;
  catalogueCategoryName: string;
  domainId: string | null;
  summary: string;
  description: string;
  /** Price in cents of `currency`. null = members / subscription only. 0 = free. */
  price: number | null;
  /** Original price in cents of `currency`, if discounted. */
  priceWas: number | null;
  /** ISO 4217 code `price`/`priceWas` are expressed in. Defaults to 'USD' when absent -- all static catalogue data here is USD. */
  currency?: string;
  pricing: PricingModel;
  level: CourseLevel;
  /** Hours of content. */
  durationHours: number;
  /** Human duration label from aiit.network, e.g. "3 Months (120 Hours)". */
  durationLabel: string;
  rating: number;
  ratingCount: number;
  enrolled: number;
  statuses: CourseStatus[];
  instructorId: string | null;
  image: string;
  outcomes: string[];
  /** "Course requirements" list from aiit.network. */
  requirements: string[];
  /** "Intended audience" list from aiit.network. */
  audience: string[];
  /** Superseded by `technologies` below for display -- kept for backward compatibility, no longer rendered. */
  toolsCovered: string[];
  /** "What you'll explore" -- structured technology/tool list, course-detail only. */
  technologies: CourseTechnology[];
  curriculum: CurriculumModule[];
  certification: string;
  publishedAt: string;
  updatedAt: string;
}

// The Webinar entity itself is DB-driven now (apps/api's Webinar Prisma
// model, see @aiit/shared's PublicWebinar/AdminWebinar/LearnerWebinar) --
// this file no longer has its own static type/data for it, see
// data/webinars.ts's doc comment.

export type EventKind = 'webinar' | 'workshop' | 'masterclass' | 'info-session' | 'event';

export interface LiveEvent {
  id: string;
  slug: string;
  kind: EventKind;
  title: string;
  summary: string;
  startsAt: string | null;
  scheduleNote: string;
  speaker: string | null;
  registrationOpen: boolean;
  registrationUrl: string;
  image: string;
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  readMinutes: number;
  publishedAt: string;
  image: string;
  /** Optional second hero image — shown alongside `image` on the article. */
  image2?: string;
  featured: boolean;
  tags: string[];
  /** Word count of the body — the full text is loaded on demand, see
   *  `loadResourceBody` in data/resources.ts. */
  words: number;
  /** Canonical URL where the post was originally published, if any. */
  source?: string;
  /** Layout/visual preset key -- a resource-detail.css modifier class, e.g. "editorial" | "tutorial". Always present; build-time ingestion defaults missing/unknown values to "editorial". */
  preset: string;
  /** SEO overrides (admin portal "SEO & Metadata" fields) -- fall back to title/excerpt/image when absent. */
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
}

export interface EcosystemStep {
  index: string;
  key: string;
  title: string;
  body: string;
}

export interface Advantage {
  index: string;
  title: string;
  body: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Product {
  slug: string;
  name: string;
  /** Price in cents. */
  price: number | null;
  /** Pre-sale price in cents, if on sale. */
  priceWas: number | null;
  category: string;
  summary: string;
  images: string[];
}

export interface NavItem {
  label: string;
  to: string;
  /** Optional grouped children for mega/overlay menus. */
  children?: { label: string; to: string; description?: string }[];
}

