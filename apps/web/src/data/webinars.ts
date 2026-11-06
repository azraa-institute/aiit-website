import type { LiveEvent } from './types';

/** "Why attend this free webinar" — verbatim bullets from aiit.network. Generic copy, not specific to any one webinar, so it stays static rather than living on the DB-driven Webinar entity (see apps/api's Webinar model / GET /webinars). */
export const WEBINAR_WHY_ATTEND = [
  'An introduction to technology career pathways',
  'A clearer understanding of different technology fields',
  'Guidance on choosing an AIIT Academy programme',
  'Information about programme duration, fees and learning support',
  'An opportunity to ask questions directly to the AIIT team',
  'Guidance on available internship and higher-education pathways',
];

/** "Your roadmap from beginner to global tech opportunities" — generic to the AIIT Academy journey, not any one
    webinar, so it stays static alongside WEBINAR_WHY_ATTEND rather than living on the DB-driven Webinar entity. */
export const WEBINAR_ROADMAP = [
  { title: 'Attend our 100% free webinar', body: "Explore technology fields and identify a path that interests you." },
  { title: 'Enroll in your chosen programme', body: 'Select a suitable AIIT Academy course and begin your training.' },
  { title: 'Learn in-demand tech skills', body: 'Build practical knowledge through structured learning.' },
  { title: 'Earn your certificate', body: 'Complete your programme and earn a certificate in your chosen field.' },
  { title: 'Build your portfolio', body: 'Develop projects that demonstrate your skills.' },
  {
    title: 'Pursue internship abroad & higher-education opportunities',
    body: 'Access guidance on internship facilitation and higher-education pathways, subject to eligibility and availability.',
  },
  { title: 'Work towards a global tech career', body: 'Prepare to pursue opportunities with local and international companies.' },
];

/** The full catalogue of AIIT Academy technology learning paths — broader than any single webinar's own agenda
    (which covers only the fields in that specific live session), so this stays static too. */
export const WEBINAR_LEARNING_PATHS = [
  {
    title: 'Artificial Intelligence Engineering',
    body: 'Explore AI fundamentals, machine learning, deep learning and the development of intelligent applications.',
  },
  {
    title: 'Generative AI & Large Language Models',
    body: 'Understand generative AI, large language models and how AI-powered tools and applications are developed and used.',
  },
  {
    title: 'Data Science & Analytics',
    body: 'Build an understanding of data analysis, interpreting trends, extracting insights and making data-driven decisions.',
  },
  {
    title: 'Cloud Computing',
    body: 'Explore cloud infrastructure, computing services and the technologies that power modern digital applications.',
  },
  {
    title: 'Quantum Computing',
    body: 'Get introduced to quantum computing concepts and an emerging field of advanced computing.',
  },
  {
    title: 'Edge Computing & IoT Systems',
    body: 'Explore connected devices, edge computing architecture and how data can be processed closer to where it is generated.',
  },
  {
    title: 'Cyber Security & Ethical Hacking',
    body: 'Understand cyber threats, system protection, security fundamentals and ethical hacking concepts.',
  },
  {
    title: 'Cisco CCNA — Networking',
    body: 'Build networking knowledge covering network fundamentals, connectivity and essential networking concepts.',
  },
  {
    title: 'Blockchain Technology & Web3',
    body: 'Explore blockchain architecture, consensus mechanisms, smart contracts, decentralized applications and Web3 concepts.',
  },
  {
    title: 'Digital & Tech Literacy',
    body: 'Build foundational digital knowledge and essential technology skills as a starting point for further learning.',
  },
  {
    title: 'Software Development',
    body: 'Explore software development fundamentals and the principles behind building digital applications.',
  },
  {
    title: 'Graphic & Web Design',
    body: 'Explore visual design and web design fundamentals for creating digital experiences and online interfaces.',
  },
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
