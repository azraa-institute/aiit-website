import type { Course } from '@/data/types';
import { getDomain } from '@/data/technologies';
import type { CourseQuery } from '@/components/course/CourseFilters';

const FEATURED_ORDER = [
  'crs-ai-engineering',
  'crs-genai-llm',
  'crs-data-science',
  'crs-cloud-fundamentals',
  'crs-edge-computing',
  'crs-quantum-fundamentals',
  'crs-ethical-hacking',
  'crs-ccna',
  'crs-blockchain',
];

/** Query fields for multi-select categories are comma-joined slugs/values
 * (e.g. domain: "ai,cloud-computing") -- empty string means "no filter". */
function toList(v: string): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}

export function filterAndSortCourses(courses: Course[], q: CourseQuery): Course[] {
  const term = q.q.trim().toLowerCase();
  const domains = toList(q.domain);
  const levels = toList(q.level);
  const statuses = toList(q.status);
  const pricings = toList(q.pricing);

  let out = courses.filter((c) => {
    if (domains.length) {
      const d = getDomain(c.domainId);
      if (!d || !domains.includes(d.slug)) return false;
    }
    if (levels.length && !levels.includes(c.level)) return false;
    if (statuses.length && !statuses.some((s) => c.statuses.includes(s as Course['statuses'][number]))) return false;
    if (pricings.length && !pricings.includes(c.pricing)) return false;
    if (term) {
      const hay = `${c.title} ${c.summary} ${c.description} ${getDomain(c.domainId)?.name ?? ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  const byDate = (a: Course, b: Course, dir: number) =>
    dir * (Date.parse(a.publishedAt) - Date.parse(b.publishedAt));

  switch (q.sort) {
    case 'newest':
      out = [...out].sort((a, b) => byDate(a, b, -1));
      break;
    case 'oldest':
      out = [...out].sort((a, b) => byDate(a, b, 1));
      break;
    case 'price-high':
      out = [...out].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      break;
    case 'price-low':
      out = [...out].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case 'popular':
      out = [...out].sort((a, b) => b.enrolled - a.enrolled);
      break;
    case 'rating':
      out = [...out].sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
      break;
    default: {
      // 'featured' — curated order, then most-enrolled
      const rank = (c: Course) => {
        const i = FEATURED_ORDER.indexOf(c.id);
        return i === -1 ? 999 : i;
      };
      out = [...out].sort((a, b) => rank(a) - rank(b) || b.enrolled - a.enrolled);
    }
  }

  return out;
}
