import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { COURSES } from '@/data/courses';
import { CourseCard } from '@/components/course/CourseCard';
import {
  CourseFilters,
  DEFAULT_QUERY,
  type CourseQuery,
} from '@/components/course/CourseFilters';
import { filterAndSortCourses } from '@/lib/filterCourses';
import { Button } from '@/components/primitives/Button';
import './courses-page.css';

export default function CoursesPage() {
  const [params, setParams] = useSearchParams();

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

  const results = useMemo(() => filterAndSortCourses(COURSES, query), [query]);
  useScrollReveal([results.length, query.domain, query.sort]);

  return (
    <Layout>
      <Seo
        title="Courses"
        description="Search and filter every AIIT programme, Artificial Intelligence, Data Science, Cloud, Edge and Quantum Computing, cybersecurity, blockchain and more."
        path="/courses"
      />
      <PageBanner
        eyebrow="Courses"
        title="Courses"
        intro="Practical, project-based programmes in AI, Data Science, Cloud, Cyber Security and more, search, filter and compare, then start."
      />

      <div className="section container container--wide">
        <div className="courses-page">
          <aside className="courses-page__filters">
            <CourseFilters
              query={query}
              onChange={patch}
              onReset={() => setParams({}, { replace: true })}
              resultCount={results.length}
            />
          </aside>

          <div className="courses-page__results">
            {results.length === 0 ? (
              <div className="courses-page__empty">
                <p className="heading">No courses match those filters.</p>
                <p>Try widening the domain or clearing the search term.</p>
                <Button as="button" variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="courses-page__grid">
                {results.map((c, i) => (
                  <CourseCard key={c.id} course={c} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
