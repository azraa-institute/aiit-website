import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { RESOURCES } from '@/data/resources';
import { editorialSections, shortCategory } from '@/lib/resourceEditorial';
import { formatDate, slugify } from '@/lib/format';

const BY_DATE = [...RESOURCES].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
const LEAD = BY_DATE.filter((r) => r.featured).slice(0, 1)[0] ?? BY_DATE[0];
const STREAM = BY_DATE.filter((r) => r.id !== LEAD?.id).slice(0, 6);

export default function PortalResourcesPage() {
  useScrollReveal([]);
  const sections = editorialSections();

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Learning resources</p>
        <h1 className="portal-page__title">Keep learning between lessons</h1>
        <p className="portal-page__intro">
          Guides, explainers and career resources from AIIT — the same library that sits behind{' '}
          <Link to="/resources">AIIT Resources</Link>.
        </p>
      </header>

      {LEAD ? (
        <Link to={`/resources/${LEAD.slug}`} className="pres-lead" data-reveal>
          <span className="pres-lead__cat">{shortCategory(LEAD.category)}</span>
          <span className="pres-lead__title">{LEAD.title}</span>
          <span className="pres-lead__excerpt">{LEAD.excerpt}</span>
          <span className="pres-lead__meta">
            {formatDate(LEAD.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {LEAD.readMinutes} min read
          </span>
        </Link>
      ) : null}

      <section className="portal-section" data-reveal>
        <p className="portal-eyebrow">Latest</p>
        <ul className="pres-stream" role="list">
          {STREAM.map((r) => (
            <li key={r.id}>
              <Link to={`/resources/${r.slug}`} className="pres-stream__item">
                <span className="pres-stream__cat">{shortCategory(r.category)}</span>
                <span className="pres-stream__title">{r.title}</span>
                <span className="pres-stream__meta">{r.readMinutes} min</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="portal-section" data-reveal>
        <p className="portal-eyebrow">By topic</p>
        <ul className="pres-topics" role="list">
          {sections.map((s) => (
            <li key={s.name}>
              <Link to={`/resources?field=${slugify(s.short)}`} className="pres-topic">
                <span className="pres-topic__name">{s.name}</span>
                <span className="pres-topic__count">
                  {s.count} {s.count === 1 ? 'article' : 'articles'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
