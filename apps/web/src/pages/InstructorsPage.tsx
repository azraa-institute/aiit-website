import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { INSTRUCTORS } from '@/data/instructors';
import type { Instructor } from '@/data/types';
import './instructors-page.css';

/** Approved page description — the single source for the copy below. */
const PAGE_INTRO =
  'AIIT courses are delivered by the AIIT Network teaching team, practitioners across AI, data, cloud, networking and emerging technologies.';

/**
 * The practice fields named in PAGE_INTRO ("…across AI, data, cloud, networking
 * and emerging technologies"). A page-level index of what the teaching team
 * practices across — NOT per-instructor credentials (instructor records carry
 * no `focus` entries).
 */
const FIELDS = ['AI', 'Data', 'Cloud', 'Networking', 'Emerging Technologies'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

/**
 * One instructor as an editorial record — a dark monogram plate beside indexed
 * metadata. Data-driven, so adding instructors needs no layout change.
 */
function InstructorProfile({ instructor, index }: { instructor: Instructor; index: number }) {
  return (
    <li
      className="ins-p"
      data-reveal
      style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
    >
      <div className="ins-p__plate" aria-hidden="true">
        <span className="ins-p__plate-light" />
        <span className="ins-p__plate-index">{pad2(index + 1)}</span>
        <span className="ins-p__monogram">{initials(instructor.name)}</span>
        <span className="ins-p__plate-foot">
          <span className="ins-p__plate-tag">{instructor.name}</span>
        </span>
      </div>

      <div className="ins-p__meta">
        <p className="ins-p__marker">
          <span className="ins-p__marker-num">{pad2(index + 1)}</span>
          <span className="ins-p__marker-label eyebrow">Practitioner</span>
        </p>
        <h2 className="ins-p__name">{instructor.name}</h2>
        <p className="ins-p__role">{instructor.title}</p>
        <p className="ins-p__bio">{instructor.bio}</p>
        <span className="ins-p__rule" aria-hidden="true" />
      </div>
    </li>
  );
}

export default function InstructorsPage() {
  useScrollReveal();
  const practitioners = INSTRUCTORS.filter((i) => i.id !== 'ins-aiit');

  return (
    <Layout>
      <Seo
        title="Instructors"
        description="The instructors and teaching team behind AIIT courses."
        path="/instructors"
      />

      {/* ---------- Hero ---------- */}
      <header className="section section--lg section--ink on-ink ins-hero">
        <div className="ins-hero__atmosphere" aria-hidden="true" />
        <div className="container container--wide ins-hero__inner">
          <nav className="ins-hero__crumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link to="/">AIIT.network</Link>
              </li>
              <li className="ins-hero__crumb-sep" aria-hidden="true">
                &rsaquo;
              </li>
              <li aria-current="page">Instructors</li>
            </ol>
          </nav>

          <p className="eyebrow ins-hero__label" data-reveal>
            Instructors
          </p>
          <h1 className="ins-hero__title" data-reveal>
            Instructors
          </h1>
          <p className="ins-hero__intro" data-reveal>
            {PAGE_INTRO}
          </p>
        </div>
      </header>

      {/* ---------- Practitioner archive ---------- */}
      <section className="section section--lg ins-archive">
        <div className="container container--wide">
          <ol className="ins-archive__list" role="list">
            {practitioners.map((ins, i) => (
              <InstructorProfile key={ins.id} instructor={ins} index={i} />
            ))}
          </ol>

          <aside className="ins-fields" aria-labelledby="ins-fields-heading" data-reveal>
            <p className="ins-fields__heading eyebrow" id="ins-fields-heading">
              Fields of practice
            </p>
            <ol className="ins-fields__list" role="list">
              {FIELDS.map((field, i) => (
                <li
                  className="ins-fields__item"
                  key={field}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <span className="ins-fields__index">{pad2(i + 1)}</span>
                  <span className="ins-fields__name">{field}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </Layout>
  );
}
