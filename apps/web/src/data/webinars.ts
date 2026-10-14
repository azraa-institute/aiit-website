import type { LiveEvent } from './types';

/** "Why attend this free webinar" — verbatim bullets from aiit.network. Generic copy, not specific to any one webinar, so it stays static rather than living on the DB-driven Webinar entity (see apps/api's Webinar model / GET /webinars). */
export const WEBINAR_WHY_ATTEND = [
  'Understand three high-demand technology areas in one session',
  'Get clear guidance on how to begin learning with AIIT Academy',
  'Learn about course structure, fees, durations and support pathways',
  'Discover internship facilitation and higher-education scholarship guidance',
  'Ask questions live and get practical answers from the AIIT team',
];

/** The wider "Live at AIIT" rail — currently just the one webinar on the real site. */
export const LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'evt-modern-it',
    slug: 'mastering-modern-information-technology',
    kind: 'webinar',
    title: 'Mastering Modern Information Technology',
    summary: 'AI, cyber security and blockchain explained in one practical session, live, with Q&A.',
    startsAt: null,
    scheduleNote: 'To be announced',
    speaker: 'AIIT Academy',
    registrationOpen: true,
    registrationUrl: '/webinar#register',
    image: '/assets/webinar/aiit-free-webinar.webp',
  },
];
