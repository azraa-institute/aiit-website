import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import {
  editorialFront,
  editorialSections,
  shortCategory,
} from '@/lib/resourceEditorial';
import { Plate } from '@/components/primitives/Plate';
import { formatDate, pluralize, slugify } from '@/lib/format';
import './resources-page.css';

const shortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

/** How many stream rows to show before "Show all". */
const STREAM_INITIAL = 8;

const ArrowGlyph = () => (
  <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
    <path
      d="M10.5 1l4 4-4 4M14 5H1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const openGlobalSearch = () => {
  document.querySelector<HTMLElement>('.site-header__search-toggle')?.click();
};

export default function ResourcesPage() {
  const [params, setParams] = useSearchParams();
  const sections = useMemo(() => editorialSections(), []);

  const fieldParam = params.get('field');
  const activeSection = sections.find((s) => slugify(s.short) === fieldParam);
  const activeCat = activeSection?.name;

  /** Hover emphasis: the field the reader is currently pointing at. */
  const [focusCat, setFocusCat] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const front = useMemo(() => editorialFront(activeCat), [activeCat]);

  useScrollReveal([fieldParam]);

  const goField = (slug?: string) => {
    setParams(slug ? { field: slug } : {});
    setFocusCat(null);
    setShowAll(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const dim = (category: string): 'true' | undefined =>
    focusCat && category !== focusCat ? 'true' : undefined;

  const { lead, secondary, rest } = front;
  // Don't hide just a couple of rows behind a button.
  const collapsible = rest.length > STREAM_INITIAL + 3;
  const visibleRest = showAll || !collapsible ? rest : rest.slice(0, STREAM_INITIAL);
  const streamLabel = activeSection ? `More in ${activeSection.name}` : 'More to read';

  return (
    <Layout>
      <Seo
        title={activeSection ? `${activeSection.name} — AIIT Resources` : 'AIIT Resources'}
        description="Free guides and explainers from AIIT on AI, cloud, cybersecurity, networking and building a tech career."
        path="/resources"
      />

      {/* ---------- 01 · Masthead ---------- */}
      <header className="res-masthead">
        <div className="container container--wide res-masthead__inner">
          <span className="res-kicker">AIIT Resources</span>

          {activeSection ? (
            <>
              <h1 className="res-masthead__title res-masthead__title--field" data-reveal>
                {activeSection.name}
              </h1>
              {activeSection.blurb && (
                <p className="res-masthead__lede">{activeSection.blurb}</p>
              )}
              <button type="button" className="res-masthead__back" onClick={() => goField()}>
                <span aria-hidden="true">&larr;</span> All resources
              </button>
            </>
          ) : (
            <>
              <h1 className="res-masthead__title" data-reveal>
                <span className="res-masthead__title-1">Technology</span>{' '}
                <span className="res-masthead__title-2">Intelligence</span>
              </h1>
              <p className="res-masthead__lede">
                Free guides and explainers on AI, cloud, cybersecurity, networking and building a
                tech career.
              </p>
            </>
          )}

          <button type="button" className="res-search" onClick={openGlobalSearch}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Search articles
          </button>
        </div>
      </header>

      {/* ---------- 02 · Editorial index ---------- */}
      <nav className="res-index" aria-label="Resource fields">
        <div className="container container--wide res-index__inner">
          <button
            type="button"
            className="res-index__item"
            data-active={!activeSection || undefined}
            onClick={() => goField()}
            onMouseEnter={() => setFocusCat(null)}
            onFocus={() => setFocusCat(null)}
          >
            All
          </button>
          {sections.map((s) => (
            <button
              key={s.name}
              type="button"
              className="res-index__item"
              data-active={activeSection?.name === s.name || undefined}
              onClick={() => goField(slugify(s.short))}
              onMouseEnter={() => setFocusCat(s.name)}
              onMouseLeave={() => setFocusCat(null)}
              onFocus={() => setFocusCat(s.name)}
              onBlur={() => setFocusCat(null)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </nav>

      {/* ---------- 03–04 · Lead + features ---------- */}
      <div className="res-body container container--wide">
        {lead && (
          <Link
            to={`/resources/${lead.slug}`}
            className="res-lead"
            data-reveal
            data-dim={dim(lead.category)}
          >
            <div className="res-lead__media">
              <Plate source={lead.image} seed={lead.slug} fit="natural" />
              <span className="res-lead__marker" aria-hidden="true" />
            </div>
            <div className="res-lead__copy">
              <span className="res-tag">{shortCategory(lead.category)}</span>
              <h2 className="res-lead__title">{lead.title}</h2>
              <p className="res-lead__deck">{lead.excerpt}</p>
              <span className="res-meta">
                <span>{shortDate(lead.publishedAt)}</span>
                <span className="res-dot" aria-hidden="true" />
                <span>{pluralize(lead.readMinutes, 'min')} read</span>
                <span className="res-lead__go">
                  Read <ArrowGlyph />
                </span>
              </span>
            </div>
          </Link>
        )}

        {secondary.length > 0 && (
          <div className="res-secondary">
            {secondary.map((r, i) => (
              <Link
                key={r.id}
                to={`/resources/${r.slug}`}
                className="res-feature"
                data-reveal
                data-dim={dim(r.category)}
                style={{ '--reveal-delay': `${i * 80}ms` } as CSSProperties}
              >
                <div className="res-feature__media">
                  <Plate source={r.image} seed={r.slug} fit="natural" />
                </div>
                <span className="res-tag">{shortCategory(r.category)}</span>
                <h3 className="res-feature__title">{r.title}</h3>
                <p className="res-feature__deck">{r.excerpt}</p>
                <span className="res-meta">
                  <span>{shortDate(r.publishedAt)}</span>
                  <span className="res-dot" aria-hidden="true" />
                  <span>{pluralize(r.readMinutes, 'min')} read</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ---------- 05 · Everything else — one list ---------- */}
        {rest.length > 0 && (
          <section className="res-stream" aria-label={streamLabel}>
            <div className="res-stream__head">
              <p className="res-eyebrow">{streamLabel}</p>
              <span className="res-stream__total">
                {rest.length} {rest.length === 1 ? 'article' : 'articles'}
              </span>
            </div>
            <ul className="res-stream__list">
              {visibleRest.map((r) => (
                <li key={r.id} data-dim={dim(r.category)}>
                  <Link to={`/resources/${r.slug}`} className="res-row">
                    <span className="res-tag res-row__tag">{shortCategory(r.category)}</span>
                    <span className="res-row__title">{r.title}</span>
                    <span className="res-row__meta">
                      <span>{shortDate(r.publishedAt)}</span>
                      <span className="res-dot" aria-hidden="true" />
                      <span>{pluralize(r.readMinutes, 'min')} read</span>
                    </span>
                    <span className="res-row__media">
                      <Plate source={r.image} seed={r.slug} fit="natural" />
                    </span>
                    <span className="res-row__arrow" aria-hidden="true">
                      <ArrowGlyph />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {collapsible && !showAll && (
              <button type="button" className="res-stream__more" onClick={() => setShowAll(true)}>
                Show all {rest.length} articles <ArrowGlyph />
              </button>
            )}
          </section>
        )}

        {activeSection && (
          <div className="res-body__foot">
            <button type="button" className="res-masthead__back" onClick={() => goField()}>
              <span aria-hidden="true">&larr;</span> All resources
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
