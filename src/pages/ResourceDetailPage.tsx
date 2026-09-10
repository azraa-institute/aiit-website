import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useScrollProgress } from '@/lib/useScrollProgress';
import { getResource, loadResourceBody } from '@/data/resources';
import {
  adjacentResources,
  relatedResources,
  shortCategory,
  categoryBlurb,
} from '@/lib/resourceEditorial';
import { articleToHtml, extractHeadings } from '@/lib/markdown';
import type { Heading } from '@/lib/markdown';
import type { Resource } from '@/data/types';
import { Plate } from '@/components/primitives/Plate';
import { NewsletterForm } from '@/components/common/NewsletterForm';
import { formatDate, pluralize } from '@/lib/format';
import './resource-detail.css';

const shortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

/** Loads one post's body, renders it to HTML and derives its heading outline. */
function useArticleBody(slug: string) {
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRaw(null);
    loadResourceBody(slug).then((b) => {
      if (alive) setRaw(b);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const html = useMemo(() => (raw ? articleToHtml(raw) : ''), [raw]);
  const headings = useMemo(() => (html ? extractHeadings(html) : []), [html]);
  return { loading: raw === null, html, headings };
}

function ArticleBody({ loading, html }: { loading: boolean; html: string }) {
  if (loading) {
    return (
      <div className="article-copy article-copy--loading" aria-busy="true">
        <span className="article-copy__skeleton" />
        <span className="article-copy__skeleton" />
        <span className="article-copy__skeleton" />
      </div>
    );
  }
  if (!html) return null;
  return <div className="article-copy" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Table of contents from the article's <h2>/<h3>. Only shown for articles
 *  with enough structure to be worth navigating (3+ headings). The rail
 *  variant tracks the section on screen and glides a highlight to it. */
function ArticleToc({ headings, variant }: { headings: Heading[]; variant: 'rail' | 'inline' }) {
  const [activeId, setActiveId] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const [marker, setMarker] = useState({ top: 0, height: 0, shown: false });

  // Which section is on screen.
  useEffect(() => {
    if (variant !== 'rail' || headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el != null);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const onscreen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (onscreen[0]) setActiveId(onscreen[0].target.id);
      },
      { rootMargin: '-18% 0px -72% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings, variant]);

  // Position the gliding highlight over the active entry.
  useEffect(() => {
    if (variant !== 'rail') return;
    const place = () => {
      const list = listRef.current;
      const li = activeId
        ? list?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(activeId)}"]`)
        : null;
      if (li) {
        setMarker({ top: li.offsetTop, height: li.offsetHeight, shown: true });
        // Keep the active entry (and its highlight) visible inside the panel:
        // on long articles the rail scrolls internally, so the highlight can
        // glide out of the panel's clipped area without this nudge.
        const scroller = li.closest<HTMLElement>('.article-rail__inner');
        if (scroller && scroller.scrollHeight > scroller.clientHeight) {
          const pad = 44; // leave a little context around the active entry
          const liBox = li.getBoundingClientRect();
          const sBox = scroller.getBoundingClientRect();
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          let delta = 0;
          if (liBox.top < sBox.top + pad) delta = liBox.top - sBox.top - pad;
          else if (liBox.bottom > sBox.bottom - pad) delta = liBox.bottom - sBox.bottom + pad;
          if (delta !== 0) scroller.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
        }
      } else {
        setMarker((m) => ({ ...m, shown: false }));
      }
    };
    place();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [activeId, variant, headings]);

  if (headings.length < 3) return null;

  const items = (
    <ol className="article-toc__list" ref={listRef}>
      {headings.map((h) => (
        <li key={h.id} data-id={h.id} data-level={h.level} data-active={activeId === h.id || undefined}>
          <a href={`#${h.id}`}>{h.text}</a>
        </li>
      ))}
    </ol>
  );

  if (variant === 'inline') {
    return (
      <details className="article-toc article-toc--inline">
        <summary>
          <span>Contents</span>
          <span className="article-toc__count">{headings.length}</span>
        </summary>
        {items}
      </details>
    );
  }

  return (
    <nav className="article-toc article-toc--rail" aria-label="On this page">
      <p className="article-toc__label">On this page</p>
      <div className="article-toc__body">
        <span
          className="article-toc__marker"
          aria-hidden="true"
          data-shown={marker.shown || undefined}
          style={{ '--m-top': `${marker.top}px`, '--m-h': `${marker.height}px` } as CSSProperties}
        />
        {items}
      </div>
    </nav>
  );
}

interface RailLinkProps {
  resource: Resource;
  kind: 'prev' | 'next';
  near?: boolean;
}

function RailLink({ resource, kind, near }: RailLinkProps) {
  return (
    <Link
      to={`/resources/${resource.slug}`}
      className="article-rail__link"
      data-kind={kind}
      data-near={near || undefined}
    >
      <span className="article-rail__role">
        {kind === 'prev' ? 'Previous' : 'Next'}
        <span className="article-rail__chev" aria-hidden="true">
          {kind === 'prev' ? '↑' : '↓'}
        </span>
      </span>
      <span className="article-rail__title">{resource.title}</span>
      <span className="article-rail__peek">
        <span className="article-rail__peek-media">
          <Plate source={resource.image} seed={resource.slug} fit="natural" />
        </span>
        <span className="article-rail__peek-cat res-tag">{shortCategory(resource.category)}</span>
      </span>
    </Link>
  );
}

export default function ResourceDetailPage() {
  const { slug } = useParams();
  const resource = slug ? getResource(slug) : undefined;
  const shellRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLDivElement>(null);
  const onFrame = useCallback((p: number) => {
    shellRef.current?.style.setProperty('--p', String(p));
  }, []);
  const progress = useScrollProgress(readRef, { onFrame, stateStep: 0.03 });
  useScrollReveal([slug]);

  const { loading, html, headings } = useArticleBody(resource?.slug ?? '');

  if (!resource) return <Navigate to="/resources" replace />;

  const { prev, next } = adjacentResources(resource.slug);
  const related = relatedResources(resource.slug, 5);
  const nearEnd = progress > 0.62;
  const upNext = next ?? related[0];
  const moreLinks = related.filter((r) => r.id !== upNext?.id).slice(0, 3);
  const isStub = resource.words < 90;

  return (
    <Layout>
      <Seo
        title={resource.title}
        description={resource.excerpt}
        path={`/resources/${resource.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: resource.title,
          description: resource.excerpt,
          datePublished: resource.publishedAt,
          author: { '@type': 'Organization', name: resource.author },
          publisher: organizationLd(),
        }}
      />

      <div className="article-shell" ref={shellRef}>
        <div className="article-line" aria-hidden="true">
          <span className="article-line__fill" />
        </div>

        <article>
          <div className="article-read" ref={readRef}>
            {/* ---------- Hero ---------- */}
            <header className="article-hero container">
              <nav className="article-hero__crumb" aria-label="Breadcrumb">
                <Link to="/resources">AIIT Resources</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{resource.category}</span>
              </nav>
              <p className="res-tag article-hero__field" data-reveal>
                {shortCategory(resource.category)}
              </p>
              <h1 className="article-hero__title" data-reveal>
                {resource.title}
              </h1>
              <p className="article-hero__deck" data-reveal>
                {resource.excerpt}
              </p>
              <p className="article-hero__meta" data-reveal>
                <span>{shortDate(resource.publishedAt)}</span>
                <span className="res-dot" aria-hidden="true" />
                <span>{pluralize(resource.readMinutes, 'min')} read</span>
                <span className="res-dot" aria-hidden="true" />
                <span>AIIT Editorial</span>
              </p>
            </header>

            <figure
              className={`article-hero__figure container${resource.image2 ? ' article-hero__figure--pair' : ''}`}
              data-reveal
            >
              <Plate
                source={resource.image}
                seed={resource.slug}
                fit="natural"
                className="article-hero__image"
              />
              {resource.image2 && (
                <Plate
                  source={resource.image2}
                  seed={`${resource.slug}-2`}
                  fit="natural"
                  className="article-hero__image"
                />
              )}
            </figure>

            {/* ---------- Reading column + rail ---------- */}
            <div className="article-layout container">
              <div className="article-body prose">
                <ArticleToc headings={headings} variant="inline" />

                <ArticleBody loading={loading} html={html} />

                {isStub && (
                  <aside className="article-body__note">
                    <p className="article-body__note-label">Full article coming soon</p>
                    <p>
                      We&rsquo;re moving the complete version of this piece into the AIIT Resources
                      archive. For now you&rsquo;re reading its opening.
                    </p>
                  </aside>
                )}

                {(prev || next) && (
                  <nav className="article-pager" aria-label="More in AIIT Resources">
                    {prev ? (
                      <Link to={`/resources/${prev.slug}`} className="article-pager__link" data-kind="prev">
                        <span className="article-pager__role">
                          <span aria-hidden="true">↑</span> Previous
                        </span>
                        <span className="article-pager__title">{prev.title}</span>
                      </Link>
                    ) : (
                      <span />
                    )}
                    {next && (
                      <Link to={`/resources/${next.slug}`} className="article-pager__link" data-kind="next">
                        <span className="article-pager__role">
                          Next <span aria-hidden="true">↓</span>
                        </span>
                        <span className="article-pager__title">{next.title}</span>
                      </Link>
                    )}
                  </nav>
                )}
              </div>

              <aside className="article-rail" aria-label="Move through AIIT Resources">
                <div className="article-rail__inner">
                  <ArticleToc headings={headings} variant="rail" />

                  <div className="article-rail__nav">
                    {prev && <RailLink resource={prev} kind="prev" />}

                    <div className="article-rail__now">
                      <span className="article-rail__now-label">In this field</span>
                      <span className="article-rail__now-cat">{resource.category}</span>
                    </div>

                    {next && <RailLink resource={next} kind="next" near={nearEnd} />}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* ---------- Keep reading — one consolidated block ---------- */}
          {upNext && (
            <section className="article-next container" data-reveal>
              <p className="article-next__label">
                Keep reading
                {categoryBlurb(resource.category) && (
                  <span className="article-next__blurb"> · {shortCategory(resource.category)}</span>
                )}
              </p>
              <Link to={`/resources/${upNext.slug}`} className="article-next__story">
                <div className="article-next__media">
                  <Plate source={upNext.image} seed={upNext.slug} fit="natural" />
                </div>
                <div className="article-next__copy">
                  <span className="res-tag">{shortCategory(upNext.category)}</span>
                  <h2 className="article-next__title">{upNext.title}</h2>
                  <p className="article-next__deck">{upNext.excerpt}</p>
                  <span className="res-meta">
                    <span>{shortDate(upNext.publishedAt)}</span>
                    <span className="res-dot" aria-hidden="true" />
                    <span>{pluralize(upNext.readMinutes, 'min')} read</span>
                  </span>
                </div>
              </Link>

              {moreLinks.length > 0 && (
                <ul className="article-next__more">
                  {moreLinks.map((r) => (
                    <li key={r.id}>
                      <Link to={`/resources/${r.slug}`} className="article-next__more-row">
                        <span className="res-tag">{shortCategory(r.category)}</span>
                        <span className="article-next__more-title">{r.title}</span>
                        <span className="article-next__more-meta">{shortDate(r.publishedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="article-signup container container--text" data-reveal>
            <p className="res-eyebrow">The AIIT dispatch</p>
            <h2 className="article-signup__title">Get new resources by email</h2>
            <p className="article-signup__body">
              A short note when we publish. Guides, explainers and career resources — no noise.
            </p>
            <NewsletterForm />
          </section>
        </article>
      </div>
    </Layout>
  );
}
