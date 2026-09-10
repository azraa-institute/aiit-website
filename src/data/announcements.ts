/**
 * Top announcement bar content. No backend — edit these values to update the
 * bar. The webinar block is built to be filled in when it is finalised.
 */

export const ADMISSIONS_ANNOUNCEMENT = {
  message: 'Admissions for 2026 intake are now open',
  /** Existing route the message links to. */
  link: '/register',
} as const;

export type WebinarStatus = 'coming-soon' | 'scheduled' | 'live' | 'ended';

export interface WebinarAnnouncement {
  status: WebinarStatus;
  webinarTitle?: string;
  webinarDate?: string;
  webinarTime?: string;
  /** Internal route or full URL. Falls back to the existing /webinar page. */
  webinarLink?: string;
}

/**
 * The webinar has not been announced. Keep `status: 'coming-soon'` until it is,
 * then set `status: 'scheduled'` and fill the fields below.
 */
export const WEBINAR_ANNOUNCEMENT: WebinarAnnouncement = {
  status: 'coming-soon',
  webinarLink: '/webinar',
  // webinarTitle: 'Mastering Modern Information Technology',
  // webinarDate: '',
  // webinarTime: '',
};

/** The label shown for the webinar, derived from its status. */
export function webinarLabel(w: WebinarAnnouncement = WEBINAR_ANNOUNCEMENT): string {
  const scheduled = [w.webinarTitle, w.webinarDate, w.webinarTime].filter(Boolean).join(' · ');
  switch (w.status) {
    case 'live':
      return w.webinarTitle ? `Live now — ${w.webinarTitle}` : 'Live webinar in progress';
    case 'scheduled':
      return scheduled ? `Live webinar — ${scheduled}` : 'Live webinar scheduled';
    case 'ended':
      return 'Live webinar — recording coming soon';
    default:
      return 'Live webinar — announcement coming soon';
  }
}
