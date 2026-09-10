import { TECHNOLOGY_DOMAINS } from '@/data/technologies';
import { COURSES } from '@/data/courses';
import { cn } from '@/lib/cn';
import './course-filters.css';

export interface CourseQuery {
  q: string;
  domain: string;
  level: string;
  status: string;
  pricing: string;
  sort: string;
}

export const DEFAULT_QUERY: CourseQuery = {
  q: '',
  domain: 'all',
  level: 'all',
  status: 'all',
  pricing: 'all',
  sort: 'featured',
};

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const STATUSES: { value: string; label: string }[] = [
  { value: 'hot', label: 'Popular' },
  { value: 'new', label: 'New' },
  { value: 'special', label: 'Special' },
  { value: 'coming-soon', label: 'Coming soon' },
];
const PRICING = [
  { value: 'paid', label: 'Paid' },
  { value: 'free', label: 'Free' },
  { value: 'subscription', label: 'Subscription' },
];
export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'popular', label: 'Most enrolled' },
  { value: 'rating', label: 'Overall rating' },
];

interface CourseFiltersProps {
  query: CourseQuery;
  onChange: (patch: Partial<CourseQuery>) => void;
  onReset: () => void;
  resultCount: number;
}

/** Domains that actually have at least one course in the catalogue. */
const DOMAIN_IDS_WITH_COURSES = new Set(COURSES.map((c) => c.domainId));
const DOMAINS_WITH_COURSES = TECHNOLOGY_DOMAINS.filter((d) =>
  DOMAIN_IDS_WITH_COURSES.has(d.id),
).sort((a, b) => a.order - b.order);

export function CourseFilters({ query, onChange, onReset, resultCount }: CourseFiltersProps) {
  const dirty = JSON.stringify(query) !== JSON.stringify(DEFAULT_QUERY);

  return (
    <div className="course-filters">
      <div className="course-filters__search">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <input
          type="search"
          placeholder="Search courses, e.g. “machine learning”"
          value={query.q}
          onChange={(e) => onChange({ q: e.target.value })}
          aria-label="Search courses"
        />
      </div>

      <div className="course-filters__row">
        <FilterGroup label="Domain">
          <Chip active={query.domain === 'all'} onClick={() => onChange({ domain: 'all' })}>
            All
          </Chip>
          {DOMAINS_WITH_COURSES.map((d) => (
            <Chip
              key={d.id}
              active={query.domain === d.slug}
              onClick={() => onChange({ domain: query.domain === d.slug ? 'all' : d.slug })}
            >
              {d.name}
            </Chip>
          ))}
        </FilterGroup>
      </div>

      <div className="course-filters__row course-filters__row--split">
        <FilterGroup label="Level">
          {LEVELS.map((l) => (
            <Chip
              key={l}
              active={query.level === l}
              onClick={() => onChange({ level: query.level === l ? 'all' : l })}
            >
              {l}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          {STATUSES.map((s) => (
            <Chip
              key={s.value}
              active={query.status === s.value}
              onClick={() => onChange({ status: query.status === s.value ? 'all' : s.value })}
            >
              {s.label}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Pricing">
          {PRICING.map((p) => (
            <Chip
              key={p.value}
              active={query.pricing === p.value}
              onClick={() => onChange({ pricing: query.pricing === p.value ? 'all' : p.value })}
            >
              {p.label}
            </Chip>
          ))}
        </FilterGroup>
      </div>

      <div className="course-filters__foot">
        <p className="course-filters__count">
          <strong>{resultCount}</strong> {resultCount === 1 ? 'course' : 'courses'}
        </p>
        <div className="course-filters__sort">
          <label htmlFor="course-sort">Sort</label>
          <select
            id="course-sort"
            value={query.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {dirty && (
          <button className="course-filters__reset" onClick={onReset}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <span className="filter-group__label">{label}</span>
      <div className="filter-group__chips">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={cn('chip', active && 'chip--active')} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}
