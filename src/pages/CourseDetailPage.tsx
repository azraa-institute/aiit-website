import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { getCourse, COURSES } from '@/data/courses';
import { getDomain } from '@/data/technologies';
import { getInstructor } from '@/data/instructors';
import { formatPrice, discountPercent, formatEnrollment } from '@/lib/format';
import { Plate } from '@/components/primitives/Plate';
import { Button } from '@/components/primitives/Button';
import { Stars } from '@/components/common/Stars';
import { CourseCard } from '@/components/course/CourseCard';
import './course-detail.css';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const course = slug ? getCourse(slug) : undefined;
  useScrollReveal([slug]);

  if (!course) return <Navigate to="/courses" replace />;

  const domain = getDomain(course.domainId);
  const instructor = getInstructor(course.instructorId);
  const off = discountPercent(course.price, course.priceWas);
  const comingSoon = course.statuses.includes('coming-soon');
  const related = COURSES.filter(
    (c) => c.id !== course.id && c.domainId === course.domainId,
  ).slice(0, 3);
  const relatedFallback =
    related.length < 3
      ? COURSES.filter((c) => c.id !== course.id && !related.includes(c)).slice(0, 3 - related.length)
      : [];

  return (
    <Layout>
      <Seo
        title={course.title}
        description={course.summary}
        path={`/courses/${course.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: course.summary,
          provider: organizationLd(),
          educationalLevel: course.level,
          ...(course.price != null && course.price > 0
            ? {
                offers: {
                  '@type': 'Offer',
                  price: (course.price / 100).toFixed(2),
                  priceCurrency: 'USD',
                },
              }
            : {}),
        }}
      />

      <article className="course-detail">
        <header className="course-detail__hero">
          <div className="container container--wide">
            <nav className="course-detail__crumbs" aria-label="Breadcrumb">
              <Link to="/courses">Courses</Link>
              <span aria-hidden="true">/</span>
              <Link to={`/courses?domain=${domain?.slug ?? ''}`}>{domain?.name ?? 'Technology'}</Link>
            </nav>

            <div className="course-detail__hero-grid">
              <div className="course-detail__hero-text">
                <div className="course-detail__badges">
                  {course.statuses.map((s) => (
                    <span key={s} className="tag tag--accent">
                      {s.replace('-', ' ')}
                    </span>
                  ))}
                </div>
                <h1 className="course-detail__title">{course.title}</h1>
                <p className="course-detail__summary">{course.summary}</p>

                <dl className="course-detail__stats">
                  <div>
                    <dt>Level</dt>
                    <dd>{course.level}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{course.durationLabel || 'TBA'}</dd>
                  </div>
                  <div>
                    <dt>Certified by</dt>
                    <dd>AIIT</dd>
                  </div>
                  <div>
                    <dt>Enrolled</dt>
                    <dd>{comingSoon ? 'Opening soon' : formatEnrollment(course.enrolled)}</dd>
                  </div>
                  <div>
                    <dt>Rating</dt>
                    <dd>{course.rating > 0 ? <Stars value={course.rating} count={course.ratingCount} /> : 'New'}</dd>
                  </div>
                </dl>
              </div>

              <aside className="course-detail__enroll" data-reveal>
                <Plate source={course.image} seed={course.slug} motif={domain?.motif} ratio={4 / 3} />
                <div className="course-detail__enroll-body">
                  <div className="course-detail__price">
                    {course.priceWas && <span className="course-detail__was">{formatPrice(course.priceWas)}</span>}
                    <span className="course-detail__now">{formatPrice(course.price)}</span>
                    {off && <span className="course-detail__off">Save {off}%</span>}
                  </div>
                  {course.pricing === 'subscription' && (
                    <p className="course-detail__note">Included with AIIT membership.</p>
                  )}
                  <Button as="link" to="/register" fullWidth size="lg" arrow>
                    {comingSoon ? 'Join the waitlist' : 'Enroll now'}
                  </Button>
                  <Button as="link" to="/webinar" variant="secondary" fullWidth>
                    Ask about this course
                  </Button>
                  <p className="course-detail__cert-note">{course.certification}</p>
                </div>
              </aside>
            </div>
          </div>
        </header>

        <div className="container container--wide course-detail__main">
          <div className="course-detail__content">
            <section data-reveal>
              <h2 className="course-detail__h2">About this course</h2>
              <p className="course-detail__prose">{course.description}</p>
            </section>

            <section data-reveal>
              <h2 className="course-detail__h2">What you&apos;ll be able to do</h2>
              <ul className="course-detail__outcomes">
                {course.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>

            {course.toolsCovered.length > 0 && (
              <section data-reveal>
                <h2 className="course-detail__h2">Tools covered</h2>
                <ul className="course-detail__tools">
                  {course.toolsCovered.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            {course.requirements.length > 0 && (
              <section data-reveal>
                <h2 className="course-detail__h2">Course requirements</h2>
                <ul className="course-detail__outcomes">
                  {course.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            {course.audience.length > 0 && (
              <section data-reveal>
                <h2 className="course-detail__h2">Intended audience</h2>
                <ul className="course-detail__outcomes">
                  {course.audience.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {instructor && (
              <section data-reveal>
                <h2 className="course-detail__h2">Who teaches it</h2>
                <div className="course-detail__instructor">
                  <div className="course-detail__instructor-mark" aria-hidden="true">
                    {instructor.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="course-detail__instructor-name">{instructor.name}</p>
                    <p className="course-detail__instructor-title">{instructor.title}</p>
                    <p className="course-detail__instructor-bio">{instructor.bio}</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="course-detail__aside">
            <h2 className="course-detail__h2">In this pathway</h2>
            <p className="course-detail__aside-text">
              This course sits in the {domain?.name} domain and counts toward the AIIT progression:
              learn, build, certify, then use the AIIT Blueprint for global pathways.
            </p>
            <Button as="link" to={`/courses?domain=${domain?.slug ?? ''}`} variant="link">
              All {domain?.name} courses
            </Button>
          </aside>
        </div>

        <section className="section container container--wide course-detail__related">
          <h2 className="course-detail__h2">Continue exploring</h2>
          <div className="course-detail__related-grid">
            {[...related, ...relatedFallback].map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      </article>
    </Layout>
  );
}
