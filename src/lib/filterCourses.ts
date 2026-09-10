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

export function filterAndSortCourses(courses: Course[], q: CourseQuery): Course[] {
  const term = q.q.trim().toLowerCase();

  let out = courses.filter((c) => {
    if (q.domain !== 'all') {
      const d = getDomain(c.domainId);
      if (d?.slug !== q.domain) return false;
    }
    if (q.level !== 'all' && c.level !== q.level) return false;
    if (q.status !== 'all' && !c.statuses.includes(q.status as Course['statuses'][number])) return false;
    if (q.pricing !== 'all' && c.pricing !== q.pricing) return false;
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
