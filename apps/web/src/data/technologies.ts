import type { CourseCategory, TechnologyDomain } from './types';

/**
 * Course categories exactly as they appear on aiit.network's course filters and
 * course pages. The homepage "focus" tabs use the same names.
 */
export const COURSE_CATEGORIES: CourseCategory[] = [
  { id: 'cat-cloud', name: 'Cloud Computing', domainId: 'cloud-computing' },
  { id: 'cat-ai', name: 'Artificial Intelligence', domainId: 'artificial-intelligence' },
  { id: 'cat-design', name: 'Graphic & Web-design', domainId: 'design' },
  { id: 'cat-software', name: 'Software Development', domainId: 'software-development' },
  { id: 'cat-data', name: 'Data Analytics & Data Science', domainId: 'data-science' },
  { id: 'cat-security', name: 'Networking & Cybersecurity', domainId: 'cybersecurity' },
  { id: 'cat-blockchain', name: 'Blockchain Technology', domainId: 'blockchain' },
  { id: 'cat-edge', name: 'Edge Computing', domainId: 'edge-computing' },
  { id: 'cat-quantum', name: 'Quantum Computing', domainId: 'quantum-computing' },
  { id: 'cat-literacy', name: 'Digital & Tech Literacy', domainId: 'digital-literacy' },
];

/**
 * AIIT's copy names several future-ready technology focus areas (Artificial
 * Intelligence, Data Science, Cloud, Quantum, Edge, AR/VR). The domains listed
 * here are the ones the catalogue actually teaches: AR/VR is a stated area of
 * interest in the prose but is NOT offered as a course, so it is not a domain.
 * `primary` marks the domains shown on the homepage "focus areas" rail.
 * Adding a domain is a one-object change.
 */
export const TECHNOLOGY_DOMAINS: TechnologyDomain[] = [
  {
    id: 'artificial-intelligence',
    slug: 'artificial-intelligence',
    name: 'Artificial Intelligence',
    tagline: 'Build intelligent systems.',
    summary:
      'Machine learning, deep learning, NLP, computer vision, Generative AI and MLOps, the practice of building and deploying AI-powered applications.',
    motif: 'lattice',
    order: 0,
    primary: true,
    image: '/assets/courses/ai-engineering.jpg',
    courseCategoryIds: ['cat-ai'],
  },
  {
    id: 'data-science',
    slug: 'data-analytics-data-science',
    name: 'Data Science',
    tagline: 'Turn data into insight and action.',
    summary:
      'Collect, process, analyse and visualise data to support decision-making, the full path from raw data to a decision.',
    motif: 'flow',
    order: 1,
    primary: true,
    image: '/assets/courses/data-sci-and-analytics.jpg',
    courseCategoryIds: ['cat-data'],
  },
  {
    id: 'cloud-computing',
    slug: 'cloud-computing',
    name: 'Cloud Computing',
    tagline: 'Understand the infrastructure behind modern digital services.',
    summary:
      'Servers, storage, databases and networking delivered over the internet, how businesses build, manage and scale applications on cloud platforms.',
    motif: 'depth',
    order: 2,
    primary: true,
    image: '/assets/courses/cloud-computing-fundamentals.jpg',
    courseCategoryIds: ['cat-cloud'],
  },
  {
    id: 'quantum-computing',
    slug: 'quantum-computing',
    name: 'Quantum Computing',
    tagline: 'Explore a new paradigm of computation.',
    summary:
      'Quantum mechanics concepts, quantum algorithms and quantum programming, an introduction to the revolutionary field of quantum computing.',
    motif: 'horizon',
    order: 3,
    primary: true,
    image: '/assets/courses/quantum-computing-fundamentals.jpg',
    courseCategoryIds: ['cat-quantum'],
  },
  {
    id: 'edge-computing',
    slug: 'edge-computing',
    name: 'Edge Computing',
    tagline: 'Bring intelligence closer to where data is created.',
    summary:
      'Edge architecture, cloud vs fog vs edge, IoT and real-time analytics, computing that happens closer to the source of data generation.',
    motif: 'signal',
    order: 4,
    primary: true,
    image: '/assets/courses/edge-server-computing.jpg',
    courseCategoryIds: ['cat-edge'],
  },
  {
    id: 'cybersecurity',
    slug: 'networking-cybersecurity',
    name: 'Networking & Cybersecurity',
    tagline: 'Defend the systems the world runs on.',
    summary:
      'Network fundamentals, ethical hacking and Cisco CCNA preparation, from the OSI model to offensive and defensive security practice.',
    motif: 'strata',
    order: 6,
    primary: false,
    image: '/assets/courses/cisco-ccna-cisco-certified-network-associate.jpg',
    courseCategoryIds: ['cat-security'],
  },
  {
    id: 'blockchain',
    slug: 'blockchain-technology',
    name: 'Blockchain Technology',
    tagline: 'Build with distributed trust.',
    summary:
      'Blockchain fundamentals, smart contracts and decentralised applications, secure, transparent systems and use cases beyond cryptocurrency.',
    motif: 'field',
    order: 7,
    primary: false,
    image: '/assets/courses/blockchain-technology.jpg',
    courseCategoryIds: ['cat-blockchain'],
  },
  {
    id: 'software-development',
    slug: 'software-development',
    name: 'Software Development',
    tagline: 'Ship software that lasts.',
    summary: 'Programming foundations and the craft of building maintainable software.',
    motif: 'mesh',
    order: 8,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
    courseCategoryIds: ['cat-software'],
  },
  {
    id: 'digital-literacy',
    slug: 'digital-tech-literacy',
    name: 'Digital & Technology Literacy',
    tagline: 'Start from the very beginning.',
    summary:
      "AIIT's free entry-point course for students new to computers, the internet, cloud computing or AI.",
    motif: 'field',
    order: 9,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
    courseCategoryIds: ['cat-literacy'],
  },
  {
    id: 'design',
    slug: 'graphic-web-design',
    name: 'Graphic & Web Design',
    tagline: 'Design for screens and systems.',
    summary: 'Visual systems, layout and web fundamentals.',
    motif: 'strata',
    order: 10,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
    courseCategoryIds: ['cat-design'],
  },
];

/** Legacy emoji focus-pill list — superseded by PRIMARY_DOMAINS, no longer rendered. */
export const HOME_FOCUS_TABS = [
  { emoji: '☁️', name: 'Cloud Computing', slug: 'cloud-computing' },
  { emoji: '', name: 'Artificial Intelligence', slug: 'artificial-intelligence' },
  { emoji: '', name: 'Graphic & Web-design', slug: 'graphic-web-design' },
  { emoji: '', name: 'Software Development', slug: 'software-development' },
  { emoji: '📊', name: 'Data Analytics & Data Science', slug: 'data-analytics-data-science' },
];

export const PRIMARY_DOMAINS = TECHNOLOGY_DOMAINS.filter((d) => d.primary).sort(
  (a, b) => a.order - b.order,
);

export function getDomain(id: string | null): TechnologyDomain | undefined {
  if (!id) return undefined;
  return TECHNOLOGY_DOMAINS.find((d) => d.id === id || d.slug === id);
}

export function getCategory(id: string): CourseCategory | undefined {
  return COURSE_CATEGORIES.find((c) => c.id === id);
}
