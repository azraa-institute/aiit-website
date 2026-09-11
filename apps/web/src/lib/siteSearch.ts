import { COURSES } from '@/data/courses';
import { RESOURCES } from '@/data/resources';
import { FAQS } from '@/data/faqs';
import { getDomain } from '@/data/technologies';

export type SearchType = 'Course' | 'Article' | 'Page' | 'FAQ';

export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle?: string;
  to: string;
  hay: string;
}

/** Meaningful non-course, non-article destinations. */
const PAGES: Omit<SearchResult, 'hay'>[] = [
  { id: 'pg-about', type: 'Page', title: 'About AIIT', subtitle: 'The institute, the mission, the method', to: '/about' },
  { id: 'pg-why', type: 'Page', title: 'Why Join AIIT', subtitle: 'Seven reasons learners choose AIIT', to: '/why-join' },
  { id: 'pg-blueprint', type: 'Page', title: 'AIIT Blueprint', subtitle: 'Your gateway to global higher education', to: '/aiit-blueprint' },
  { id: 'pg-instructors', type: 'Page', title: 'Instructors', subtitle: 'The people who teach at AIIT', to: '/instructors' },
  { id: 'pg-webinar', type: 'Page', title: 'Free live webinar', subtitle: 'AI, Cyber Security & Blockchain in one session', to: '/webinar' },
  { id: 'pg-blog', type: 'Page', title: 'AIIT.network Blog', subtitle: 'Guides, explainers and career resources', to: '/resources' },
  { id: 'pg-affiliate', type: 'Page', title: 'Affiliate Programme', subtitle: 'Refer learners, earn on every enrolment', to: '/affiliate' },
  { id: 'pg-shop', type: 'Page', title: 'AIIT Shop', subtitle: 'Branded merchandise and the learner kit', to: '/shop' },
  { id: 'pg-faqs', type: 'Page', title: 'FAQs', subtitle: 'Answers on courses, certification and pricing', to: '/faqs' },
  { id: 'pg-contact', type: 'Page', title: 'Contact Us', subtitle: "We'd love to hear from you", to: '/contact' },
];

/** Built once at module load from the site's own data. */
const INDEX: SearchResult[] = [
  ...COURSES.map((c) => ({
    id: c.id,
    type: 'Course' as const,
    title: c.title,
    subtitle: getDomain(c.domainId)?.name,
    to: `/courses/${c.slug}`,
    hay: `${c.title} ${c.summary} ${c.description} ${getDomain(c.domainId)?.name ?? ''}`.toLowerCase(),
  })),
  ...RESOURCES.map((r) => ({
    id: r.id,
    type: 'Article' as const,
    title: r.title,
    subtitle: r.category,
    to: `/resources/${r.slug}`,
    hay: `${r.title} ${r.excerpt} ${r.tags.join(' ')}`.toLowerCase(),
  })),
  ...PAGES.map((p) => ({ ...p, hay: `${p.title} ${p.subtitle ?? ''}`.toLowerCase() })),
  ...FAQS.map((f) => ({
    id: f.id,
    type: 'FAQ' as const,
    title: f.question,
    subtitle: f.category,
    to: '/faqs',
    hay: `${f.question} ${f.answer}`.toLowerCase(),
  })),
];

export const SEARCH_TYPE_ORDER: SearchType[] = ['Course', 'Article', 'Page', 'FAQ'];

export function searchSite(term: string, limit = 9): SearchResult[] {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return [];

  return INDEX.map((r) => {
    const title = r.title.toLowerCase();
    let score = 0;
    if (title === t) score = 100;
    else if (title.startsWith(t)) score = 82;
    else if (title.includes(` ${t}`)) score = 64;
    else if (title.includes(t)) score = 48;
    else if (r.hay.includes(t)) score = 22;
    // gently favour courses and articles over generic page hits
    if (score && (r.type === 'Course' || r.type === 'Article')) score += 4;
    return { r, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.title.length - b.r.title.length)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Splits `text` around the first case-insensitive match of `term`. */
export function splitMatch(text: string, term: string): [string, string, string] {
  const t = term.trim();
  if (!t) return [text, '', ''];
  const i = text.toLowerCase().indexOf(t.toLowerCase());
  if (i === -1) return [text, '', ''];
  return [text.slice(0, i), text.slice(i, i + t.length), text.slice(i + t.length)];
}
