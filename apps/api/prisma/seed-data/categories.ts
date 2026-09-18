/**
 * CourseCategory rows -- the catalogue's "Subcategory" (see the
 * Course.catalogueCategory doc comment in schema.prisma for the top-level
 * "Category" concept, which lives on the course itself, not here). `key` is
 * this seed's own join key -- CourseCategory has no natural unique key in
 * the schema, so seed.ts uses `key` purely to join courses to the category
 * it creates; it is never persisted. `domainSlug` still ties a subcategory
 * to the older, decorative CourseDomain concept where a natural one exists
 * (unchanged from before this taxonomy update); the two brand-new
 * subcategories have no natural domain, so it's null.
 */
export interface CategorySeed {
  key: string;
  name: string;
  domainSlug: string | null;
}

export const CATEGORIES: CategorySeed[] = [
  { key: 'cat-cloud', name: 'Cloud Computing', domainSlug: 'cloud-computing' },
  { key: 'cat-ai', name: 'Generative & Agentic AI', domainSlug: 'artificial-intelligence' },
  { key: 'cat-design', name: 'Graphic & Web-design', domainSlug: 'graphic-web-design' },
  { key: 'cat-software', name: 'Software Development', domainSlug: 'software-development' },
  {
    key: 'cat-data',
    name: 'Data Analytics & Data Science',
    domainSlug: 'data-analytics-data-science',
  },
  { key: 'cat-networking', name: 'Networking', domainSlug: 'networking-cybersecurity' },
  { key: 'cat-cybersecurity', name: 'Cybersecurity', domainSlug: 'networking-cybersecurity' },
  { key: 'cat-blockchain', name: 'Blockchain & Web3 Fundamentals', domainSlug: 'blockchain-technology' },
  { key: 'cat-edge', name: 'Edge Computing & IoT', domainSlug: 'edge-computing' },
  { key: 'cat-quantum', name: 'Quantum Computing', domainSlug: 'quantum-computing' },
  { key: 'cat-literacy', name: 'Digital & Technology Literacy', domainSlug: 'digital-tech-literacy' },
  { key: 'cat-digital-marketing', name: 'Digital Marketing', domainSlug: null },
  { key: 'cat-it-business', name: 'IT Business Management', domainSlug: null },
];
