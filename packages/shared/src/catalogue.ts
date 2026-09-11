export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
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
  categoryName: string;
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
}

export interface CourseDetail extends CourseListItem {
  description: string;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  toolsCovered: string[];
  certification: string;
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
