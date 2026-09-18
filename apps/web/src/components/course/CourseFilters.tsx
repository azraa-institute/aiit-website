import { useEffect, useRef, useState } from 'react';
import { CATALOGUE_CATEGORIES } from '@/data/catalogueCategories';
import { COURSES } from '@/data/courses';
import { cn } from '@/lib/cn';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { Button } from '@/components/primitives/Button';
import './course-filters.css';

export interface CourseQuery {
  q: string;
  /** Comma-joined catalogue-category slugs; '' = no filter. */
  category: string;
  level: string;
  status: string;
  pricing: string;
  sort: string;
}

export const DEFAULT_QUERY: CourseQuery = {
  q: '',
  category: '',
  level: '',
  status: '',
  pricing: '',
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

function toList(v: string): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}
function toValue(list: string[]): string {
  return list.join(',');
}
function toggled(current: string, value: string): string {
  const list = toList(current);
  return toValue(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
}

interface CourseFiltersProps {
  query: CourseQuery;
  onChange: (patch: Partial<CourseQuery>) => void;
  onReset: () => void;
}

/** Catalogue categories that actually have at least one course. */
const CATEGORY_SLUGS_WITH_COURSES = new Set(COURSES.map((c) => c.catalogueCategorySlug));
const CATEGORIES_WITH_COURSES = CATALOGUE_CATEGORIES.filter((c) => CATEGORY_SLUGS_WITH_COURSES.has(c.slug));

const activeCount = (q: CourseQuery) =>
  toList(q.category).length + toList(q.level).length + toList(q.status).length + toList(q.pricing).length;

const LABELS = {
  category: (v: string) => CATEGORIES_WITH_COURSES.find((c) => c.slug === v)?.name ?? v,
  level: (v: string) => v,
  status: (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v,
  pricing: (v: string) => PRICING.find((p) => p.value === v)?.label ?? v,
} as const;

export function CourseFilters({ query, onChange, onReset }: CourseFiltersProps) {
  const dirty = JSON.stringify(query) !== JSON.stringify(DEFAULT_QUERY);
  const nFilters = activeCount(query);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // The search box keeps its own local value and syncs to the URL-backed
  // query on a short debounce, instead of being driven directly by
  // query.q -- round-tripping every keystroke through useSearchParams()
  // couldn't keep up with normal typing speed and was dropping characters.
  const [localQ, setLocalQ] = useState(query.q);
  useEffect(() => {
    setLocalQ(query.q);
  }, [query.q]);
  useEffect(() => {
    if (localQ === query.q) return;
    const id = setTimeout(() => onChange({ q: localQ }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQ]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setPopoverOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  useLockBodyScroll(sheetOpen);

  const selectedChips = (
    ['category', 'level', 'status', 'pricing'] as const
  ).flatMap((key) => toList(query[key]).map((value) => ({ key, value })));

  return (
    <div className="course-toolbar">
      <div className="course-search">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search courses, technology, certification…"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          aria-label="Search courses"
        />
        {localQ && (
          <button
            type="button"
            className="course-search__clear"
            onClick={() => {
              setLocalQ('');
              onChange({ q: '' });
            }}
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="course-toolbar__row">
        <div className="course-quickchips">
          <Chip active={!query.category} onClick={() => onChange({ category: '' })}>
            All
          </Chip>
          {CATEGORIES_WITH_COURSES.map((c) => (
            <Chip
              key={c.slug}
              active={toList(query.category).includes(c.slug)}
              onClick={() => onChange({ category: toggled(query.category, c.slug) })}
            >
              {c.name}
            </Chip>
          ))}
        </div>

        <div className="course-toolbar__controls">
          <div className="course-filterbtn-wrap" ref={popoverRef}>
            <button
              type="button"
              className="course-filterbtn"
              aria-haspopup="dialog"
              aria-expanded={popoverOpen}
              onClick={() => setPopoverOpen((v) => !v)}
            >
              Filters
              {nFilters > 0 && <span className="course-filterbtn__count">{nFilters}</span>}
              <ChevronIcon />
            </button>
            {popoverOpen && (
              <div className="course-filter-popover" role="dialog" aria-label="Filter courses">
                <FilterGroups query={query} onChange={onChange} />
                <div className="course-filter-popover__foot">
                  {dirty && (
                    <button type="button" className="course-filters__reset" onClick={onReset}>
                      Clear all
                    </button>
                  )}
                  <Button as="button" type="button" size="sm" onClick={() => setPopoverOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="course-filterbtn course-filterbtn--mobile"
            onClick={() => setSheetOpen(true)}
          >
            Filters
            {nFilters > 0 && <span className="course-filterbtn__count">{nFilters}</span>}
          </button>

          <div className="course-sort">
            <label htmlFor="course-sort">Sort</label>
            <select id="course-sort" value={query.sort} onChange={(e) => onChange({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>
      </div>

      {selectedChips.length > 0 && (
        <div className="selected-filters">
          {selectedChips.map(({ key, value }) => (
            <button
              key={`${key}:${value}`}
              type="button"
              className="selected-filters__chip"
              onClick={() => onChange({ [key]: toggled(query[key], value) })}
            >
              {LABELS[key](value)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="selected-filters__clear" onClick={onReset}>
            Clear all
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="course-filter-sheet" role="dialog" aria-label="Filter courses" aria-modal="true">
          <div className="course-filter-sheet__scrim" onClick={() => setSheetOpen(false)} />
          <div className="course-filter-sheet__panel">
            <div className="course-filter-sheet__head">
              <p>Filters</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="course-filter-sheet__body">
              <FilterGroups query={query} onChange={onChange} />
            </div>
            <div className="course-filter-sheet__foot">
              {dirty && (
                <button type="button" className="course-filters__reset" onClick={onReset}>
                  Clear all
                </button>
              )}
              <Button as="button" type="button" size="sm" onClick={() => setSheetOpen(false)}>
                Apply filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared checkbox groups -- rendered inside both the desktop popover and the
 * mobile sheet, so the two never drift apart. */
function FilterGroups({
  query,
  onChange,
}: {
  query: CourseQuery;
  onChange: (patch: Partial<CourseQuery>) => void;
}) {
  return (
    <>
      <CheckGroup label="Category">
        {CATEGORIES_WITH_COURSES.map((c) => (
          <Check
            key={c.slug}
            checked={toList(query.category).includes(c.slug)}
            onChange={() => onChange({ category: toggled(query.category, c.slug) })}
          >
            {c.name}
          </Check>
        ))}
      </CheckGroup>
      <CheckGroup label="Level">
        {LEVELS.map((l) => (
          <Check key={l} checked={toList(query.level).includes(l)} onChange={() => onChange({ level: toggled(query.level, l) })}>
            {l}
          </Check>
        ))}
      </CheckGroup>
      <CheckGroup label="Status">
        {STATUSES.map((s) => (
          <Check
            key={s.value}
            checked={toList(query.status).includes(s.value)}
            onChange={() => onChange({ status: toggled(query.status, s.value) })}
          >
            {s.label}
          </Check>
        ))}
      </CheckGroup>
      <CheckGroup label="Pricing">
        {PRICING.map((p) => (
          <Check
            key={p.value}
            checked={toList(query.pricing).includes(p.value)}
            onChange={() => onChange({ pricing: toggled(query.pricing, p.value) })}
          >
            {p.label}
          </Check>
        ))}
      </CheckGroup>
    </>
  );
}

function CheckGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-check-group">
      <span className="filter-check-group__label">{label}</span>
      <div className="filter-check-group__items">{children}</div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="filter-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
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

function ChevronIcon() {
  return (
    <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true" className="chevron-icon">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
