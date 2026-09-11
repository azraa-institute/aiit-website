/* ============================================================
   AIIT DATA MODEL
   Every content type the platform renders. Presentation
   components consume these shapes only, swap this layer for a
   CMS / WordPress REST / LMS API without touching the UI.
   ============================================================ */

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';

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

export interface Course {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
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
  /** "Tools Covered" list from aiit.network. */
  toolsCovered: string[];
  curriculum: CurriculumModule[];
  certification: string;
  publishedAt: string;
  updatedAt: string;
}

export interface Webinar {
  id: string;
  slug: string;
  title: string;
  /** Short marketing headline for the hero slide. */
  heroHeadline: string;
  kicker: string;
  summary: string;
  description: string;
  /** ISO datetime or null when "to be announced". */
  startsAt: string | null;
  /** Human string shown when startsAt is null. */
  scheduleNote: string;
  durationLabel: string;
  timezoneNote: string;
  platform: string;
  price: number | null;
  language: string;
  seatsLimited: boolean;
  speakerId: string | null;
  agenda: { title: string; points: string[] }[];
  audience: string[];
  registrationUrl: string;
  image: string;
  status: 'upcoming' | 'live' | 'past';
  featured: boolean;
}

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

