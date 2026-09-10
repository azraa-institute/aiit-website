import type { LiveEvent, Webinar } from './types';

/**
 * The AIIT free live webinar — headline, copy and agenda verbatim from
 * aiit.network/freewebinar. Data-driven: a future event replaces this one
 * without touching the hero or the events section.
 */
export const WEBINARS: Webinar[] = [
  {
    id: 'web-modern-it',
    slug: 'mastering-modern-information-technology',
    title: 'Artificial Intelligence, Cyber Security & Blockchain, Explained in One Session',
    heroHeadline: 'Mastering Modern Information Technology',
    kicker: 'Free live webinar · Seats limited',
    summary:
      'A free introductory webinar from AIIT Academy for students, professionals and aspiring tech learners across Africa, Asia and beyond. Understand three in-demand tech careers and how to start learning them, live, with Q&A.',
    description:
      'A practical, beginner-friendly overview of where the opportunities are in Artificial Intelligence, Cyber Security and Blockchain, and how AIIT helps you get there. No registration fee · Certificate-track guidance included · Runs 60–90 minutes.',
    startsAt: null,
    scheduleNote: 'To be announced',
    durationLabel: '60–90 mins',
    timezoneNote: 'Africa & Asia friendly',
    platform: 'Zoom / Google Meet',
    price: 0,
    language: 'English',
    seatsLimited: true,
    speakerId: null,
    agenda: [
      {
        title: 'Artificial Intelligence',
        points: [
          'Overview of AI, Machine Learning & Generative AI',
          'Real-world applications across industries',
          'Career opportunities in AI Engineering',
          'How beginners can start learning AI with AIIT',
        ],
      },
      {
        title: 'Cyber Security & Ethical Hacking',
        points: [
          'Why cyber security matters today',
          'Common threats and how to protect systems',
          'Introduction to Ethical Hacking concepts',
          'Career paths & certifications, including Cisco CCNA',
        ],
      },
      {
        title: 'Blockchain Technology',
        points: [
          'What blockchain is and how it works',
          'Use cases beyond cryptocurrency',
          'Opportunities in blockchain development',
          'How AIIT introduces Blockchain to learners',
        ],
      },
    ],
    audience: [
      'Students and graduates interested in IT, AI, Cyber Security or Blockchain',
      'Working professionals looking to upskill or change career direction',
      'Anyone curious about the future of technology and digital skills',
      'Partners and associations who want to introduce these programmes to their members',
    ],
    registrationUrl: '/webinar#register',
    image: '/assets/webinar/aiit-free-webinar.webp',
    status: 'upcoming',
    featured: true,
  },
];

export const FEATURED_WEBINAR = WEBINARS.find((w) => w.featured) ?? WEBINARS[0];

/** "Why attend this free webinar" — verbatim bullets from aiit.network. */
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
