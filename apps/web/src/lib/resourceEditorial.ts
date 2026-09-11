/* ============================================================
   AIIT RESOURCES — EDITORIAL MODEL
   Turns the flat RESOURCES array into a composed "front page":
   a lead story, secondary features, briefs and a latest stream,
   plus the adjacency + related logic the article rail needs.

   Everything here is derived from real data in resources.ts —
   no invented titles, dates, authors or counts. The structure
   works for 5 articles or 500.
   ============================================================ */
import { RESOURCES } from '@/data/resources';
import type { Resource } from '@/data/types';

export interface CategoryMeta {
  /** Exact `category` string as stored on the resource. */
  name: string;
  /** Compact label used as story metadata (rows, cards, rail). */
  short: string;
  /** One descriptive line for the section index — what the pieces cover. */
  blurb: string;
}

/**
 * The publication's sections, in editorial reading order. Only categories
 * that actually appear in the data are ever shown (see `editorialSections`).
 */
export const CATEGORY_META: CategoryMeta[] = [
  {
    name: 'AI & Generative AI',
    short: 'AI',
    blurb: 'Artificial intelligence, machine learning and the generative shift.',
  },
  {
    name: 'Tech Explainers',
    short: 'Explainers',
    blurb: 'How the core technologies work, explained from first principles.',
  },
  {
    name: 'Cloud, Networking & Infrastructure',
    short: 'Infrastructure',
    blurb: 'The systems, networks and platforms everything else runs on.',
  },
  {
    name: 'Careers & Job Search',
    short: 'Careers',
    blurb: 'Getting hired, getting promoted and building a global tech career.',
  },
  {
    name: 'Study Abroad / Online',
    short: 'Study Abroad',
    blurb: 'International study, credit transfer and the higher-education pathway.',
  },
];

const byNewest = (a: Resource, b: Resource) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

export function resourcesInCategory(name: string): Resource[] {
  return RESOURCES.filter((r) => r.category === name).sort(byNewest);
}

export interface EditorialSection extends CategoryMeta {
  count: number;
}

/** Category index for the editorial navigation — real categories only, ordered. */
export function editorialSections(): EditorialSection[] {
  const known = new Set(CATEGORY_META.map((c) => c.name));
  const ordered = CATEGORY_META.map((c) => ({ ...c, count: resourcesInCategory(c.name).length })).filter(
    (c) => c.count > 0,
  );
  // Defensive: surface any category present in data but missing from CATEGORY_META.
  const extras = Array.from(new Set(RESOURCES.map((r) => r.category)))
    .filter((name) => !known.has(name))
    .map((name) => ({ name, short: name, blurb: '', count: resourcesInCategory(name).length }));
  return [...ordered, ...extras];
}

export interface EditorialFront {
  /** The dominant story. Featured first, then most recent. */
  lead?: Resource;
  /** Up to two supporting features. */
  secondary: Resource[];
  /** Everything else, newest first — a single scannable list. */
  rest: Resource[];
  /** Everything in the current view, newest first. */
  all: Resource[];
}

/**
 * Compose the front page: one lead, up to two features, then a single list
 * of everything else. Pass a category name for a category-specific front
 * page; omit it for the full index.
 */
export function editorialFront(category?: string): EditorialFront {
  const pool = (category ? resourcesInCategory(category) : [...RESOURCES].sort(byNewest)).slice();
  if (pool.length === 0) return { secondary: [], rest: [], all: [] };

  const featured = pool.filter((r) => r.featured);
  const lead = featured[0] ?? pool[0];
  const afterLead = pool.filter((r) => r.id !== lead.id);

  const secondary = afterLead.filter((r) => r.featured).slice(0, 2);
  const rest = afterLead.filter((r) => !secondary.some((s) => s.id === r.id));

  return { lead, secondary, rest, all: pool };
}

export interface Adjacency {
  /** The previous piece in the same category (more recent). */
  prev?: Resource;
  /** The next piece to read — same category first, then the newest other piece. */
  next?: Resource;
  /** True when `next` is a fallback outside the current category. */
  nextIsWrap: boolean;
  index: number;
  total: number;
}

/**
 * Previous / next within the SAME category (chronological), so "continue
 * reading" stays on-topic. Falls back across categories only when the
 * current category is exhausted.
 */
export function adjacentResources(slug: string): Adjacency {
  const current = RESOURCES.find((r) => r.slug === slug);
  const allOrdered = [...RESOURCES].sort(byNewest);
  if (!current) return { nextIsWrap: false, index: -1, total: allOrdered.length };

  const inCat = resourcesInCategory(current.category);
  const c = inCat.findIndex((r) => r.slug === slug);
  const globalIndex = allOrdered.findIndex((r) => r.slug === slug);

  const literalNext = inCat[c + 1];
  const fallbackNext = allOrdered.find((r) => r.slug !== slug && r.category !== current.category);

  return {
    prev: inCat[c - 1],
    next: literalNext ?? fallbackNext,
    nextIsWrap: !literalNext,
    index: globalIndex,
    total: allOrdered.length,
  };
}

/** Same-category pieces first, then the rest — newest within each group. */
export function relatedResources(slug: string, limit = 4): Resource[] {
  const current = RESOURCES.find((r) => r.slug === slug);
  if (!current) return [];
  const sameCat = RESOURCES.filter((r) => r.slug !== slug && r.category === current.category).sort(byNewest);
  const others = RESOURCES.filter((r) => r.slug !== slug && r.category !== current.category).sort(byNewest);
  return [...sameCat, ...others].slice(0, limit);
}

export function shortCategory(name: string): string {
  return CATEGORY_META.find((c) => c.name === name)?.short ?? name;
}

export function categoryBlurb(name: string): string {
  return CATEGORY_META.find((c) => c.name === name)?.blurb ?? '';
}
