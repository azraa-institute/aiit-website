import type { Course } from '@/data/types';
import type { CourseQuery } from '@/components/course/CourseFilters';

const FEATURED_ORDER = [
  'crs-agentic-ai',
  'crs-genai-llm',
  'crs-data-science',
  'crs-cloud-fundamentals',
  'crs-edge-iot',
  'crs-quantum-fundamentals',
  'crs-ethical-hacking',
  'crs-ccna',
  'crs-blockchain-web3',
];

/** Query fields for multi-select categories are comma-joined slugs/values
 * (e.g. category: "cybersecurity-networking,cloud-computing-devops") --
 * empty string means "no filter". */
function toList(v: string): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}

/** A composite level ("Intermediate–Advanced") matches a filter for either
 * half it's built from, not just an exact string match -- so picking
 * "Intermediate" in the Level filter still surfaces a course whose level
 * genuinely spans Intermediate and Advanced. */
function levelMatches(courseLevel: string, selected: string[]): boolean {
  return selected.some((l) => courseLevel === l || courseLevel.includes(l));
}

export function filterAndSortCourses(courses: Course[], q: CourseQuery): Course[] {
  const term = q.q.trim().toLowerCase();
  const categories = toList(q.category);
  const levels = toList(q.level);
  const statuses = toList(q.status);
  const pricings = toList(q.pricing);

  let out = courses.filter((c) => {
    if (categories.length && !categories.includes(c.catalogueCategorySlug)) return false;
    if (levels.length && !levelMatches(c.level, levels)) return false;
    if (statuses.length && !statuses.some((s) => c.statuses.includes(s as Course['statuses'][number]))) return false;
    if (pricings.length && !pricings.includes(c.pricing)) return false;
    if (term) {
      const hay =
        `${c.title} ${c.summary} ${c.description} ${c.catalogueCategoryName} ${c.categoryId}`.toLowerCase();
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
