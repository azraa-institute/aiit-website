import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { COURSES, FEATURED_COURSES } from '@/data/courses';
import { getDomain } from '@/data/technologies';
import type { Course, CourseStatus } from '@/data/types';
import { Section } from '@/components/primitives/Section';
import { Plate } from '@/components/primitives/Plate';
import { PopularLogoBadges } from '@/components/course/PopularLogos';
import './featured-courses.css';

const STATUS_LABEL: Partial<Record<CourseStatus, string>> = {
  new: 'New',
  featured: 'Featured',
  hot: 'Popular',
  special: 'Special',
};
const STATUS_PRIORITY: CourseStatus[] = ['new', 'featured', 'hot', 'special'];

function statusLabel(course: Course): string | null {
  const found = STATUS_PRIORITY.find((s) => course.statuses.includes(s));
  return found ? (STATUS_LABEL[found] ?? null) : null;
}

const Arrow = () => (
  <svg width="16" height="12" viewBox="0 0 18 14" aria-hidden="true">
    <path
      d="M11 1l6 6-6 6M17 7H1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Top Courses" — a curated editorial programme index, not a mini catalogue:
 * one featured programme (from the site's existing homepage curation) plus a
 * short numbered index of three more, pointing visitors to the full Courses
 * page rather than trying to summarise it. */
export function FeaturedCourses() {
  const [featured, ...restTop] = FEATURED_COURSES;
  const indexCourses = restTop.slice(0, 3);
  if (!featured) return null;

  const featuredDomain = getDomain(featured.domainId);
  const featuredStatus = statusLabel(featured);

  return (
    <Section id="courses" size="lg" className="courses-index">
      <div className="courses-index__grid" aria-hidden="true" />
      <div className="container container--wide courses-index__inner">
        <header className="courses-index__head">
          <div>
            <p className="courses-index__eyebrow">
              <span aria-hidden="true" />
              Courses
              <span aria-hidden="true" />
            </p>
            <h2 className="courses-index__heading">Top Courses</h2>
            <p className="courses-index__desc">
              Practical, project-based programmes in AI, Data Science, Cloud, Cyber Security and
              more, most on offer, all certified by AIIT.
            </p>
          </div>
          <p className="courses-index__count">{COURSES.length} Programmes</p>
        </header>

        <p className="courses-index__signature">
          AIIT Course Index <span>01 — {String(indexCourses.length + 1).padStart(2, '0')}</span>
        </p>

        <div className="courses-index__body">
          <article className="courses-index__feature" data-reveal>
            <Link
              to={`/courses/${featured.slug}`}
              className="courses-index__feature-media"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Plate
                source={featured.image}
                seed={featured.slug}
                motif={featuredDomain?.motif}
                ratio={16 / 9}
                fit="contain"
                alt=""
              />
              <PopularLogoBadges technologies={featured.technologies} />
            </Link>
            <div className="courses-index__feature-body">
              {featuredStatus && (
                <p className="courses-index__status">
                  {featuredStatus}
                  <span aria-hidden="true" />
                </p>
              )}
              <p className="courses-index__category">{featured.catalogueCategoryName}</p>
              <h3 className="courses-index__feature-title">
                <Link to={`/courses/${featured.slug}`}>{featured.title}</Link>
              </h3>
              <p className="courses-index__feature-summary">{featured.summary}</p>
              <p className="courses-index__facts">
                {featured.level} · {featured.durationLabel || 'TBA'}
              </p>
              <Link to={`/courses/${featured.slug}`} className="courses-index__explore-programme">
                Explore programme <Arrow />
              </Link>
            </div>
          </article>

          <div className="courses-index__list">
            <p className="courses-index__list-label">Selected programmes</p>
            {indexCourses.map((course, i) => {
              const domain = getDomain(course.domainId);
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="courses-index__row"
                  style={{ '--reveal-delay': `${i * 60}ms` } as CSSProperties}
                  data-reveal
                >
                  <span className="courses-index__row-num" aria-hidden="true">
                    {String(i + 2).padStart(2, '0')}
                  </span>
                  <span className="courses-index__row-body">
                    <span className="courses-index__row-category">{course.catalogueCategoryName}</span>
                    <span className="courses-index__row-title">{course.title}</span>
                    <span className="courses-index__row-facts">
                      {course.level} · {course.durationLabel || 'TBA'}
                    </span>
                  </span>
                  <span className="courses-index__row-arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                  <span className="courses-index__row-preview" aria-hidden="true">
                    <Plate
                      source={course.image}
                      seed={course.slug}
                      motif={domain?.motif}
                      ratio={16 / 9}
                      fit="contain"
                      alt=""
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="courses-index__foot">
          <Link to="/courses" className="courses-index__all">
            Explore the full catalogue
            <Arrow />
          </Link>
        </div>
      </div>
    </Section>
  );
}
