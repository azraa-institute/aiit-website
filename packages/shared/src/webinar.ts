/**
 * Admin-manageable webinar/event catalog (apps/api's `Webinar` Prisma model)
 * -- replaces what used to be a single hardcoded entry in
 * apps/web/src/data/webinars.ts. The public /webinar page fetches this
 * instead of importing a static array; `packages/shared` is type-only (see
 * index.ts), so the literal status list has no runtime array exported here.
 */

export type WebinarStatus = 'upcoming' | 'live' | 'past';

export interface WebinarAgendaItem {
  title: string;
  points: string[];
}

/**
 * The public-facing shape -- GET /webinars (list) and GET /webinars/:slug
 * (detail). `joinUrl` is deliberately absent here: it's only ever revealed
 * to someone who actually registered, via `LearnerWebinar` below, never to
 * an anonymous visitor of the public page.
 */
export interface PublicWebinar {
  id: string;
  slug: string;
  title: string;
  heroHeadline: string;
  kicker: string;
  summary: string;
  description: string;
  startsAt: string | null;
  scheduleNote: string;
  durationLabel: string;
  timezoneNote: string;
  platform: string;
  language: string;
  seatsLimited: boolean;
  agenda: WebinarAgendaItem[];
  audience: string[];
  image: string;
  videoUrl: string | null;
  videoThumbnail: string | null;
  status: WebinarStatus;
  featured: boolean;
}

/** GET /me/webinars item -- the learner's own registration, resolved against the real Webinar it belongs to. */
export interface LearnerWebinar {
  /** The registration's own id, not the Webinar's. */
  id: string;
  webinarSlug: string;
  title: string;
  startsAt: string | null;
  status: 'upcoming' | 'attended' | 'missed';
  joinUrl: string | null;
}

/** GET /admin/webinars row. */
export interface AdminWebinarSummary {
  id: string;
  slug: string;
  title: string;
  startsAt: string | null;
  status: WebinarStatus;
  featured: boolean;
  registrationCount: number;
  updatedAt: string;
}

/** GET /admin/webinars/:id -- includes joinUrl, which the public shape omits. */
export interface AdminWebinar extends PublicWebinar {
  joinUrl: string | null;
  createdAt: string;
}

/** POST/PUT body for creating or updating a webinar. */
export interface WebinarInput {
  slug: string;
  title: string;
  heroHeadline: string;
  kicker: string;
  summary: string;
  description: string;
  startsAt?: string | null;
  scheduleNote: string;
  durationLabel: string;
  timezoneNote: string;
  platform: string;
  language: string;
  seatsLimited: boolean;
  agenda: WebinarAgendaItem[];
  audience: string[];
  image: string;
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  joinUrl?: string | null;
  status: WebinarStatus;
  featured: boolean;
}

/** GET /admin/webinars/:id/registrations row. */
export interface AdminWebinarRegistrant {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  region: string;
  persona: string;
  attendedAt: string | null;
  confirmationSentAt: string | null;
  reminder24hSentAt: string | null;
  reminder30mSentAt: string | null;
  createdAt: string;
}

/** Response to the admin's manual "send now" reminder action. */
export interface WebinarReminderResult {
  kind: '24h' | '30m';
  sentCount: number;
}
