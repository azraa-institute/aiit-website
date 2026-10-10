import type { CatalogueCategorySlug } from '@aiit/shared';

/**
 * A small, hand-picked index into apps/web's real blog posts
 * (apps/web/src/content/posts/*.md) -- NOT a sync of that folder. The
 * Markdown files are parsed by a Vite virtual module at build time
 * (apps/web/vite.config.ts's `virtual:aiit-blog`), which is a web-app-only
 * build step apps/api has no access to at runtime, so there's nothing to
 * "read" here -- these are just title/excerpt/slug copied by hand from the
 * posts that are genuinely good answers to the questions Quill fields most
 * (career impact, pricing/certification value, "what will I learn"). Add an
 * entry here when a new post is worth Quill citing; nothing breaks if this
 * list drifts from the full posts folder, it just means Quill won't know
 * about a post yet.
 */
export interface QuillArticle {
  slug: string;
  title: string;
  excerpt: string;
  /** Catalogue categories this article is a good answer for -- see CATALOGUE_CATEGORIES in apps/api's catalogue.mappers.ts for the full slug list. */
  categories: CatalogueCategorySlug[];
  /** This post has a real embedded video (not just a stock hero image) -- lets Quill answer "is there a video?" honestly instead of guessing. */
  hasVideo?: boolean;
}

export const QUILL_ARTICLES: QuillArticle[] = [
  {
    slug: 'what-is-artificial-intelligence-a-complete-beginners-guide',
    title: "What Is Artificial Intelligence? A Complete Beginner's Guide",
    excerpt: 'How AI went from a futuristic idea to part of everyday life -- the concepts under the hood, in plain language.',
    categories: ['artificial-intelligence-intelligent-systems'],
  },
  {
    slug: 'ai-vs-machine-learning-vs-deep-learning-whats-the-difference',
    title: "AI vs Machine Learning vs Deep Learning: What's the Difference?",
    excerpt: 'Untangles three terms that get used interchangeably but mean different things in a job description.',
    categories: ['artificial-intelligence-intelligent-systems'],
  },
  {
    slug: 'vector-databases-explained-search-by-meaning-not-keywords',
    title: 'Vector Databases Explained: Search by Meaning, Not Keywords',
    excerpt: 'How embeddings and vector search actually work -- the backbone of every modern RAG/LLM application.',
    categories: ['artificial-intelligence-intelligent-systems', 'data-science-analytics'],
    hasVideo: true,
  },
  {
    slug: 'data-analytics-vs-data-science-whats-the-difference-and-which-should-you-learn-first',
    title: 'Data Analytics vs Data Science: Which Should You Learn First?',
    excerpt: 'A practical breakdown of the two career tracks and which one actually fits your goals.',
    categories: ['data-science-analytics'],
  },
  {
    slug: 'what-is-cloud-computing-a-simple-guide-for-beginners',
    title: 'What Is Cloud Computing? A Simple Guide for Beginners',
    excerpt: 'The cloud service models (IaaS/PaaS/SaaS) explained with examples anyone would recognize.',
    categories: ['cloud-computing-devops'],
  },
  {
    slug: 'what-is-ci-cd-automated-deployment-pipelines-explained',
    title: 'What Is CI/CD? Automated Deployment Pipelines Explained',
    excerpt: 'Why every modern engineering team ships through a pipeline, not a manual deploy.',
    categories: ['cloud-computing-devops'],
  },
  {
    slug: 'what-is-containerization-docker-and-virtual-machines-for-beginners',
    title: 'What Is Containerization? Docker and Virtual Machines for Beginners',
    excerpt: 'Docker, VMs, and why "it works on my machine" stopped being an excuse.',
    categories: ['cloud-computing-devops'],
  },
  {
    slug: 'edge-computing-vs-cloud-computing-where-does-your-data-process',
    title: 'Edge Computing vs. Cloud Computing: Where Does Your Data Process?',
    excerpt: 'When processing at the edge beats a round trip to the cloud, and why it matters for IoT/5G.',
    categories: ['cloud-computing-devops', 'emerging-advanced-computing'],
  },
  {
    slug: 'what-is-cybersecurity-a-beginners-guide-to-one-of-the-most-in-demand-skills-in-tech',
    title: "What Is Cybersecurity? A Beginner's Guide to One of the Most In-Demand Skills in Tech",
    excerpt: 'Why cybersecurity is one of the hardest tech roles to fill right now -- and where to start.',
    categories: ['cybersecurity-networking'],
  },
  {
    slug: 'what-is-networking-and-why-does-everyone-recommend-starting-with-cisco-ccna',
    title: 'What Is Networking, and Why Does Everyone Recommend Starting With Cisco CCNA?',
    excerpt: 'The case for networking fundamentals as the foundation under cybersecurity, cloud, and IT support careers.',
    categories: ['cybersecurity-networking'],
  },
  {
    slug: 'moving-from-developer-to-tech-lead-essential-leadership-skills',
    title: 'Moving from Developer to Tech Lead: Essential Leadership Skills',
    excerpt: 'What actually changes -- and what to learn -- when you move from writing code to leading the team that does.',
    categories: ['technology-management-business'],
  },
  {
    slug: 'ai-tools-changing-how-we-work-2026',
    title: '10 Ways AI Tools Are Changing How We Work in 2026',
    excerpt: 'How AI tooling is reshaping day-to-day work across marketing, ops, and engineering roles.',
    categories: ['digital-business-marketing'],
  },
];

/** Career-impact / value posts that are a good answer for ANY course, regardless of category. */
export const QUILL_CAREER_ARTICLES: QuillArticle[] = [
  {
    slug: 'how-much-do-tech-jobs-pay-in-2026-a-complete-salary-guide',
    title: 'How Much Do Tech Jobs Pay in 2026? A Complete Salary Guide',
    excerpt: 'Real current salary ranges across tech roles, region by region.',
    categories: [],
  },
  {
    slug: 'get-a-tech-job-with-no-experience-step-by-step-guide',
    title: 'How to Get a Tech Job With No Experience: Step-by-Step Guide',
    excerpt: 'A concrete path from "no experience" to a first offer, without the usual catch-22.',
    categories: [],
  },
  {
    slug: 'the-project-first-tech-resume-how-to-beat-the-experience-gap',
    title: 'The Project-First Tech Resume: How to Beat the Experience Gap',
    excerpt: "How to build a resume around real projects (like the ones in an AIIT course) instead of a work history you don't have yet.",
    categories: [],
  },
  {
    slug: 'remote-tech-jobs-in-2026-how-to-find-them-apply-and-get-hired-from-anywhere',
    title: 'Remote Tech Jobs in 2026: How to Find Them, Apply, and Get Hired From Anywhere',
    excerpt: 'A practical guide to landing remote tech work from outside the traditional hubs.',
    categories: [],
  },
  {
    slug: 'it-certification-college-credit-universities',
    title: '10 Universities Offering IT Certification College Credit',
    excerpt: 'Real universities that accept an IT certification toward degree credit.',
    categories: [],
  },
  {
    slug: 'coding-bootcamp-vs-university-vs-self-teaching-which-one-actually-gets-you-hired',
    title: 'Coding Bootcamp vs University vs Self-Teaching: Which One Actually Gets You Hired?',
    excerpt: 'An honest comparison of the three most common paths into a tech career.',
    categories: [],
  },
];

export function articlesForCategory(category: CatalogueCategorySlug, limit = 2): QuillArticle[] {
  const matched = QUILL_ARTICLES.filter((a) => a.categories.includes(category));
  return matched.slice(0, limit);
}
