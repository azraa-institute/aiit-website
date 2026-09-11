/**
 * Hand-transformed copy of apps/web/src/data/technologies.ts's COURSE_CATEGORIES.
 * `key` is the frontend's original category id (e.g. "cat-ai") -- CourseCategory
 * has no natural unique key in the schema, so seed.ts uses `key` purely to join
 * courses to the category it creates; it is never persisted.
 */
export interface CategorySeed {
  key: string;
  name: string;
  domainSlug: string | null;
}

export const CATEGORIES: CategorySeed[] = [
  { key: 'cat-cloud', name: 'Cloud Computing', domainSlug: 'cloud-computing' },
  { key: 'cat-ai', name: 'Artificial Intelligence', domainSlug: 'artificial-intelligence' },
  { key: 'cat-design', name: 'Graphic & Web-design', domainSlug: 'graphic-web-design' },
  { key: 'cat-software', name: 'Software Development', domainSlug: 'software-development' },
  {
    key: 'cat-data',
    name: 'Data Analytics & Data Science',
    domainSlug: 'data-analytics-data-science',
  },
  { key: 'cat-security', name: 'Networking & Cybersecurity', domainSlug: 'networking-cybersecurity' },
  { key: 'cat-blockchain', name: 'Blockchain Technology', domainSlug: 'blockchain-technology' },
  { key: 'cat-edge', name: 'Edge Computing', domainSlug: 'edge-computing' },
  { key: 'cat-quantum', name: 'Quantum Computing', domainSlug: 'quantum-computing' },
  { key: 'cat-literacy', name: 'Digital & Tech Literacy', domainSlug: 'digital-tech-literacy' },
];
