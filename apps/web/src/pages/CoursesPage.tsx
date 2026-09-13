import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useCourseList } from './CoursesPage.data';
import { CourseCard } from '@/components/course/CourseCard';
import {
  CourseFilters,
  DEFAULT_QUERY,
  type CourseQuery,
} from '@/components/course/CourseFilters';
import { filterAndSortCourses } from '@/lib/filterCourses';
import { Button } from '@/components/primitives/Button';
import { getDomain, TECHNOLOGY_DOMAINS } from '@/data/technologies';
import type { Course } from '@/data/types';
import './courses-page.css';

/** Stable empty-array reference so useMemo deps below don't see a "new"
 * array on every render while courses are still loading. */
const NO_COURSES: Course[] = [];

/** 6 per page once there's room for a 2-3 column grid; 4 on a single-column
 * (tablet/mobile) layout -- one breakpoint covers both "tablet" and "mobile"
 * from the brief since they call for the same count. */
function usePageSize(): number {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 700px)').matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 700px)');
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide ? 6 : 4;
}

function GridListIcon({ mode }: { mode: 'grid' | 'list' }) {
  return mode === 'grid' ? (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <path d="M1 3h13M1 7.5h13M1 12h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function CoursesPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const pageSize = usePageSize();

  const query: CourseQuery = useMemo(
    () => ({
      q: params.get('q') ?? DEFAULT_QUERY.q,
      domain: params.get('domain') ?? DEFAULT_QUERY.domain,
      level: params.get('level') ?? DEFAULT_QUERY.level,
      status: params.get('status') ?? DEFAULT_QUERY.status,
      pricing: params.get('pricing') ?? DEFAULT_QUERY.pricing,
      sort: params.get('sort') ?? DEFAULT_QUERY.sort,
    }),
    [params],
  );

  const patch = useCallback(
    (p: Partial<CourseQuery>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(p).forEach(([k, v]) => {
            if (!v || v === DEFAULT_QUERY[k as keyof CourseQuery]) next.delete(k);
            else next.set(k, v);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const courseList = useCourseList();
  const allCourses = courseList.status === 'ready' ? courseList.courses : NO_COURSES;
  const results = useMemo(() => filterAndSortCourses(allCourses, query), [allCourses, query]);
  useScrollReveal([results.length, query.domain, query.sort, page, view]);

  // Reset to page 1 whenever the query changes (a new filter/sort/search
  // should always land on the top of the results, not wherever the reader
  // happened to be paging).
  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = results.slice(start, start + pageSize);

  const domainCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allCourses.forEach((c) => {
      const d = getDomain(c.domainId);
      if (d) counts.set(d.slug, (counts.get(d.slug) ?? 0) + 1);
    });
    return TECHNOLOGY_DOMAINS.filter((d) => (counts.get(d.slug) ?? 0) > 0)
      .sort((a, b) => a.order - b.order)
      .map((d) => ({ domain: d, count: counts.get(d.slug) ?? 0 }));
  }, [allCourses]);

  return (
    <Layout>
      <Seo
        title="Courses"
        description="Search and filter every AIIT programme, Artificial Intelligence, Data Science, Cloud, Edge and Quantum Computing, cybersecurity, blockchain and more."
        path="/courses"
      />

      <header className="courses-hero" data-reveal>
        <div className="container container--wide">
          <p className="eyebrow">Courses</p>
          <h1 className="courses-hero__title">Build what comes next.</h1>
          <p className="courses-hero__intro">
            Practical, project-based programmes across AI, data, cloud, cybersecurity and emerging
            technology.
          </p>
        </div>
      </header>

      <div className="section container container--wide courses-body">
        <CourseFilters query={query} onChange={patch} onReset={() => setParams({}, { replace: true })} />

        {courseList.status === 'loading' ? (
          <>
            <div className="courses-result-summary">
              <span className="courses-coord">AIIT / COURSES</span>
              <span>Loading…</span>
            </div>
            <div className="courses-page__grid" aria-hidden="true">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div className="course-skeleton" key={i}>
                  <div className="course-skeleton__media" />
                  <div className="course-skeleton__line course-skeleton__line--cat" />
                  <div className="course-skeleton__line course-skeleton__line--title" />
                  <div className="course-skeleton__line course-skeleton__line--title-2" />
                  <div className="course-skeleton__line course-skeleton__line--meta" />
                </div>
              ))}
            </div>
          </>
        ) : courseList.status === 'error' ? (
          <div className="courses-page__empty" role="alert">
            <p className="courses-page__empty-title">Unable to load courses</p>
            <p>We couldn&apos;t retrieve the course catalogue right now.</p>
            <Button as="button" variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="courses-page__empty">
            <p className="courses-page__empty-title">No courses found</p>
            <p>Try adjusting your filters or search.</p>
            <Button as="button" variant="secondary" onClick={() => setParams({}, { replace: true })}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="courses-result-summary">
              <span className="courses-coord">AIIT / COURSES</span>
              <span>
                Showing {start + 1}–{Math.min(start + pageSize, results.length)} of {results.length}{' '}
                {results.length === 1 ? 'course' : 'courses'}
              </span>
              <div className="courses-view-toggle" role="group" aria-label="Layout">
                <button
                  type="button"
                  className={view === 'grid' ? 'is-active' : ''}
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                >
                  <GridListIcon mode="grid" />
                </button>
                <button
                  type="button"
                  className={view === 'list' ? 'is-active' : ''}
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                  aria-label="List view"
                >
                  <GridListIcon mode="list" />
                </button>
              </div>
            </div>

            <div className={view === 'grid' ? 'courses-page__grid' : 'courses-page__list'}>
              {pageItems.map((c, i) => (
                <CourseCard key={c.id} course={c} index={start + i} layout={view === 'grid' ? 'grid' : 'list'} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="courses-pagination" aria-label="Course pages">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <div className="courses-pagination__pages">
                  {paginationItems(currentPage, totalPages).map((item, i) =>
                    item === 'ellipsis' ? (
                      <span key={`e${i}`} className="courses-pagination__ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={item === currentPage ? 'is-active' : ''}
                        aria-current={item === currentPage ? 'page' : undefined}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}

        {domainCounts.length > 1 && (
          <section className="courses-explore" data-reveal>
            <p className="courses-explore__label">Explore AIIT</p>
            <ul className="courses-explore__list" role="list">
              {domainCounts.map(({ domain, count }) => (
                <li key={domain.id}>
                  <button
                    type="button"
                    className="courses-explore__item"
                    onClick={() => patch({ domain: domain.slug })}
                  >
                    <span className="courses-explore__name">{domain.name}</span>
                    <span className="courses-explore__count">
                      {count} {count === 1 ? 'course' : 'courses'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}

/** Previous · 1 2 3 … N · Next -- collapses the middle once there are more
 * than a handful of pages, always keeping first, last and the pages around
 * the current one visible. */
function paginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...items].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(n);
  });
  return out;
}
