import type { Advantage, EcosystemStep } from './types';

/**
 * "YOUR SUCCESS ROADMAP — From Learning Today to Leading Tomorrow" (homepage).
 * AIIT frames the pathway as LEARN → CERTIFY → PROGRESS → GLOBALIZE.
 */
export const ROADMAP_HEADING = 'From Learning Today to Leading Tomorrow';
export const ROADMAP_INTRO =
  "At AIIT, we don't just teach skills — we build futures. Follow the proven pathway that transforms your potential into global opportunities.";

export type StageAccent = 'red' | 'ink' | 'brass' | 'slate';
export type StageIcon =
  | 'enroll'
  | 'learn'
  | 'certificate'
  | 'portfolio'
  | 'internship'
  | 'education'
  | 'global';

export interface RoadmapStage {
  index: string;
  title: string;
  accent: StageAccent;
  icon: StageIcon;
  points: string[];
}

/** The seven-stage AIIT success roadmap: ENROLL → GLOBAL CAREER. */
export const ROADMAP_STAGES: RoadmapStage[] = [
  {
    index: '01',
    title: 'Enroll',
    accent: 'red',
    icon: 'enroll',
    points: ['Choose your career-focused course', 'Get expert guidance', 'Start your learning journey'],
  },
  {
    index: '02',
    title: 'Learn',
    accent: 'ink',
    icon: 'learn',
    points: ['Learn from industry experts', 'Hands-on projects', 'Practical, in-demand skills'],
  },
  {
    index: '03',
    title: 'Earn Certificate',
    accent: 'brass',
    icon: 'certificate',
    points: [
      'Industry-recognised certifications',
      'Boost your professional credibility',
      'Stand out in the job market',
    ],
  },
  {
    index: '04',
    title: 'Build Portfolio',
    accent: 'slate',
    icon: 'portfolio',
    points: ['Real-world projects', 'Build your showcase', 'Demonstrate your skills with confidence'],
  },
  {
    index: '05',
    title: 'Industry Internship & Experience',
    accent: 'red',
    icon: 'internship',
    points: ['Gain internship opportunities', 'Work on live projects', 'Build valuable industry exposure'],
  },
  {
    index: '06',
    title: 'Higher Education Pathways',
    accent: 'ink',
    icon: 'education',
    points: [
      'Guidance for further studies',
      'Universities in India & abroad',
      'Scholarships & admission support',
    ],
  },
  {
    index: '07',
    title: 'Global Career',
    accent: 'brass',
    icon: 'global',
    points: ['Land your dream job', 'Work with global companies', 'Grow your career worldwide'],
  },
];

export type AdvantageIcon = 'mentor' | 'live' | 'badge' | 'compass' | 'path' | 'globe';
export interface RoadmapAdvantage {
  index: string;
  title: string;
  icon: AdvantageIcon;
}

/** "AIIT ADVANTAGE" — the feature bar below the roadmap. */
export const ROADMAP_ADVANTAGES: RoadmapAdvantage[] = [
  { index: '01', title: 'Industry Experts & Mentors', icon: 'mentor' },
  { index: '02', title: 'Live Classes & Hands-on Learning', icon: 'live' },
  { index: '03', title: 'Industry Certifications', icon: 'badge' },
  { index: '04', title: 'Career Guidance & Support', icon: 'compass' },
  { index: '05', title: 'Global Education Pathways', icon: 'path' },
  { index: '06', title: 'International Opportunities', icon: 'globe' },
];

export const ECOSYSTEM_STEPS: EcosystemStep[] = [
  {
    index: '01',
    key: 'learn',
    title: 'Learn',
    body: 'Practical, project-based courses in AI, Data Science, Cyber Security, Cloud and more, taught online, priced affordably, and built for beginners through intermediate learners.',
  },
  {
    index: '02',
    key: 'certify',
    title: 'Certify',
    body: 'Earn an AIIT Certificate on completion. Selected programmes also prepare you for industry-recognised certifications, including Cisco CCNA.',
  },
  {
    index: '03',
    key: 'progress',
    title: 'Progress',
    body: 'Build a project portfolio, get career guidance, and explore internship facilitation, including UK and other destinations, on a best-efforts basis.',
  },
  {
    index: '04',
    key: 'globalize',
    title: 'Globalize',
    body: 'Use the AIIT Blueprint to turn your certificates and portfolio into university applications and international opportunities across five study destinations.',
  },
];

/**
 * "Why join AIIT.network?" — the seven reasons learners choose AIIT, verbatim
 * headings and copy from aiit.network/whyjoinaiit.
 */
export const WHY_JOIN_HEADING =
  'Why join AIIT.network? Because your global tech career starts here.';
export const WHY_JOIN_INTRO =
  'Practical, project-based courses in AI, Data Science, Cybersecurity, Cloud and more, taught online, priced affordably, and built to take you from beginner to certified professional.';
export const WHY_JOIN_SUBHEAD = 'Seven reasons learners choose AIIT';
export const WHY_JOIN_SUB_INTRO =
  'Everything you need to go from curious to certified, practical training, real support, and a clear path forward.';

export const WHY_JOIN_REASONS: { index: string; kicker: string; title: string; body: string }[] = [
  {
    index: '01',
    kicker: 'Career-focused courses',
    title: 'Practical, project-based programmes',
    body: 'Structured courses in high-demand fields, built for beginners through intermediate learners: AI Engineering, Data Science & Analytics, Generative AI & LLMs, Ethical Hacking & Cyber Security, Cisco CCNA, Cloud Computing, Edge Computing & Blockchain.',
  },
  {
    index: '02',
    kicker: 'Affordable fees',
    title: 'Quality education, accessible pricing',
    body: 'Most programmes are priced between $128–$250, making career-grade tech training genuinely reachable for students and professionals across Africa and Asia.',
  },
  {
    index: '03',
    kicker: 'Flexible learning',
    title: 'Study your way',
    body: 'Learn on PC or mobile, follow self-paced or structured modules, and access your courses from anywhere in the world.',
  },
  {
    index: '04',
    kicker: 'Certification',
    title: 'A certificate that means something',
    body: 'Earn an AIIT Certificate on completion. Selected programmes also prepare you for industry-recognised certifications, including Cisco CCNA.',
  },
  {
    index: '05',
    kicker: 'Career & education support',
    title: 'Support beyond the classroom',
    body: 'Internship facilitation (including UK and other destinations, best-efforts basis), scholarship and higher-education guidance, particularly for India, with partial scholarship pathways in Malaysia and other partner destinations, plus ongoing career guidance.',
  },
  {
    index: '06',
    kicker: 'Community & partnerships',
    title: "You're never learning alone",
    body: 'Connect with learners and professionals worldwide. Organisations and individuals can also partner with AIIT to refer students through our Affiliate Program.',
  },
  {
    index: '07',
    kicker: 'Clear guidance & support',
    title: 'No guesswork, from day one',
    body: 'Clear information on programme requirements, fees, durations, how to enrol, and the support available to you, every step of the way.',
  },
];

/** "AIIT Advantage" reshaped from WHY_JOIN_REASONS. Currently unused. */
export const ADVANTAGES: Advantage[] = WHY_JOIN_REASONS.map((r) => ({
  index: r.index,
  title: r.title,
  body: r.body,
}));

/** About page: "WE OFFER" / "OUR FOCUS AREAS" blocks. */
export const ABOUT_BLOCKS = [
  {
    kicker: 'We offer',
    title: 'Everything you need to grow in tech',
    body: 'From flexible pricing to globally usable credentials, AIIT is built around what actually helps learners move forward.',
  },
  {
    kicker: 'Our focus areas',
    title: 'Future-ready technologies, taught practically',
    body: 'Every course is built around real-world skills that map directly to where the industry is heading.',
  },
  {
    kicker: 'Where to next',
    title: 'Continue your journey with AIIT',
    body: 'Join learners around the world building real, practical skills in the technologies shaping tomorrow.',
  },
];
