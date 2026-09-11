/**
 * Hand-transformed copy of apps/web/src/data/technologies.ts's TECHNOLOGY_DOMAINS
 * -- not a live cross-app import, keeps the workspace boundary clean.
 */
export interface DomainSeed {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  motif: 'lattice' | 'flow' | 'strata' | 'field' | 'horizon' | 'depth' | 'mesh' | 'signal';
  order: number;
  primary: boolean;
  image: string;
}

export const DOMAINS: DomainSeed[] = [
  {
    slug: 'artificial-intelligence',
    name: 'Artificial Intelligence',
    tagline: 'Build intelligent systems.',
    summary:
      'Machine learning, deep learning, NLP, computer vision, Generative AI and MLOps, the practice of building and deploying AI-powered applications.',
    motif: 'lattice',
    order: 0,
    primary: true,
    image: '/assets/courses/ai-engineering.jpg',
  },
  {
    slug: 'data-analytics-data-science',
    name: 'Data Science',
    tagline: 'Turn data into insight and action.',
    summary:
      'Collect, process, analyse and visualise data to support decision-making, the full path from raw data to a decision.',
    motif: 'flow',
    order: 1,
    primary: true,
    image: '/assets/courses/data-sci-and-analytics.jpg',
  },
  {
    slug: 'cloud-computing',
    name: 'Cloud Computing',
    tagline: 'Understand the infrastructure behind modern digital services.',
    summary:
      'Servers, storage, databases and networking delivered over the internet, how businesses build, manage and scale applications on cloud platforms.',
    motif: 'depth',
    order: 2,
    primary: true,
    image: '/assets/courses/cloud-computing-fundamentals.jpg',
  },
  {
    slug: 'quantum-computing',
    name: 'Quantum Computing',
    tagline: 'Explore a new paradigm of computation.',
    summary:
      'Quantum mechanics concepts, quantum algorithms and quantum programming, an introduction to the revolutionary field of quantum computing.',
    motif: 'horizon',
    order: 3,
    primary: true,
    image: '/assets/courses/quantum-computing-fundamentals.jpg',
  },
  {
    slug: 'edge-computing',
    name: 'Edge Computing',
    tagline: 'Bring intelligence closer to where data is created.',
    summary:
      'Edge architecture, cloud vs fog vs edge, IoT and real-time analytics, computing that happens closer to the source of data generation.',
    motif: 'signal',
    order: 4,
    primary: true,
    image: '/assets/courses/edge-server-computing.jpg',
  },
  {
    slug: 'networking-cybersecurity',
    name: 'Networking & Cybersecurity',
    tagline: 'Defend the systems the world runs on.',
    summary:
      'Network fundamentals, ethical hacking and Cisco CCNA preparation, from the OSI model to offensive and defensive security practice.',
    motif: 'strata',
    order: 6,
    primary: false,
    image: '/assets/courses/cisco-ccna-cisco-certified-network-associate.jpg',
  },
  {
    slug: 'blockchain-technology',
    name: 'Blockchain Technology',
    tagline: 'Build with distributed trust.',
    summary:
      'Blockchain fundamentals, smart contracts and decentralised applications, secure, transparent systems and use cases beyond cryptocurrency.',
    motif: 'field',
    order: 7,
    primary: false,
    image: '/assets/courses/blockchain-technology.jpg',
  },
  {
    slug: 'software-development',
    name: 'Software Development',
    tagline: 'Ship software that lasts.',
    summary: 'Programming foundations and the craft of building maintainable software.',
    motif: 'mesh',
    order: 8,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
  },
  {
    slug: 'digital-tech-literacy',
    name: 'Digital & Technology Literacy',
    tagline: 'Start from the very beginning.',
    summary:
      "AIIT's free entry-point course for students new to computers, the internet, cloud computing or AI.",
    motif: 'field',
    order: 9,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
  },
  {
    slug: 'graphic-web-design',
    name: 'Graphic & Web Design',
    tagline: 'Design for screens and systems.',
    summary: 'Visual systems, layout and web fundamentals.',
    motif: 'strata',
    order: 10,
    primary: false,
    image: '/assets/courses/aiit-student-class.webp',
  },
];
