import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { RESOURCES } from '@/data/resources';
import { editorialSections, shortCategory } from '@/lib/resourceEditorial';
import { formatDate, pluralize, slugify } from '@/lib/format';
import { Plate } from '@/components/primitives/Plate';
import { markPortalExit } from '@/lib/portalReturn';
import { PortalEmpty } from './PortalEmpty';
import { ArrowRightIcon, BookIcon } from './content-icons';

/** Every link here leaves the portal shell for the public resources site --
 * mark it so the header can offer "Return to Resources" once there. */
const leavePortal = () => markPortalExit('resources');

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
        <h1 className="portal-page__title">Your AIIT learning library</h1>
        <p className="portal-page__intro">
          Practical guides, technical explainers and career resources curated to help you keep
          progressing beyond your courses — the same library that sits behind{' '}
          <Link to="/resources" onClick={leavePortal}>
            AIIT Resources
          </Link>
          .
        </p>
      </header>

      {RESOURCES.length === 0 ? (
        <PortalEmpty
          icon={<BookIcon />}
          title="Nothing here yet"
          body="New learning resources will appear here as they are published."
        />
      ) : (
        <>
          {LEAD ? (
            <Link to={`/resources/${LEAD.slug}`} className="pres-lead" onClick={leavePortal} data-reveal>
              <div className="pres-lead__copy">
                <span className="pres-lead__cat">{shortCategory(LEAD.category)}</span>
                <h2 className="pres-lead__title">{LEAD.title}</h2>
                <p className="pres-lead__excerpt">{LEAD.excerpt}</p>
                <span className="pres-lead__meta">
                  {formatDate(LEAD.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="pres-dot" aria-hidden="true" />
                  {pluralize(LEAD.readMinutes, 'min')} read
                  <span className="pres-lead__go">
                    Read <ArrowRightIcon />
                  </span>
                </span>
              </div>
              <div className="pres-lead__art">
                <Plate source={LEAD.image} seed={LEAD.slug} tone="paper" ratio={1} fit="cover" />
              </div>
            </Link>
          ) : null}

          <section className="portal-section" data-reveal>
            <p className="portal-eyebrow">Latest</p>
            <ul className="pres-stream" role="list">
              {STREAM.map((r) => (
                <li key={r.id}>
                  <Link to={`/resources/${r.slug}`} className="pres-stream__item" onClick={leavePortal}>
                    <span className="pres-stream__cat">{shortCategory(r.category)}</span>
                    <h3 className="pres-stream__title">{r.title}</h3>
                    <span className="pres-stream__meta">
                      {pluralize(r.readMinutes, 'min')} read
                      <ArrowRightIcon className="pres-stream__arrow" />
                    </span>
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
                  <Link to={`/resources?field=${slugify(s.short)}`} className="pres-topic" onClick={leavePortal}>
                    <span className="pres-topic__name">{s.name}</span>
                    <span className="pres-topic__count">
                      {s.count} {s.count === 1 ? 'resource' : 'resources'}
                      <ArrowRightIcon className="pres-topic__arrow" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
