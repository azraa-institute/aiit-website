import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LegalBookPage, LegalDoc, LegalSection } from '@/data/legal/types';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/layout/Logo';
import { SITE } from '@/data/site';
import './legal-book.css';

/** Turns a real occurrence of the org's contact email in plain paragraph/
 * closing text into a working mailto: link -- privacy.ts/terms.ts
 * interpolate SITE.contact.email into a handful of sentences ("contact us
 * at info@aiit.network") as plain strings, so this is where it actually
 * becomes clickable rather than looking like a link and doing nothing.
 * Matches the exact known address rather than a general email regex,
 * since guessing at "anything email-shaped" in legal text is exactly the
 * kind of thing that can misfire on an example address quoted for some
 * other reason. */
function linkifyEmail(text: string): ReactNode {
  const email = SITE.contact.email;
  if (!text.includes(email)) return text;
  const parts = text.split(email);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a className="legalbook__link" href={`mailto:${email}`}>
          {email}
        </a>
      )}
    </Fragment>
  ));
}

function folio(i: number): string {
  return String(i + 1).padStart(2, '0');
}

/** An abstract ruled-line page mark for the decoy pages stacked behind
 * the active leaf, so a page reads as "a document" without rendering
 * real upcoming text twice. */
function RuledMark() {
  return (
    <svg className="legalbook__ruled" viewBox="0 0 200 120" aria-hidden="true" focusable="false">
      <line x1="20" y1="14" x2="180" y2="14" />
      <line x1="20" y1="34" x2="160" y2="34" />
      <line x1="20" y1="54" x2="170" y2="54" />
      <line x1="20" y1="74" x2="130" y2="74" />
      <line x1="20" y1="94" x2="150" y2="94" />
    </svg>
  );
}

/** An institutional seal watermark, rendered fresh on every leaf (cover
 * and every content page) rather than once for the whole book -- makes
 * each page read as an official document in its own right, the way a
 * real certified/notarised document is stamped per page, not once on the
 * folder it's kept in. Centered behind the page's own text (see the
 * architecture note in legal-book.css for the stacking-order reasoning),
 * low-opacity enough that it never competes with reading the actual
 * content. Purely decorative either way -- aria-hidden. */
function Stamp() {
  return (
    <svg className="legalbook__stamp" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle className="legalbook__stamp-ring" cx="100" cy="100" r="92" strokeWidth="1" />
      <circle className="legalbook__stamp-ring" cx="100" cy="100" r="78" strokeWidth="0.75" />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 100 + Math.sin(rad) * 92;
        const y1 = 100 - Math.cos(rad) * 92;
        const x2 = 100 + Math.sin(rad) * 100;
        const y2 = 100 - Math.cos(rad) * 100;
        return <line key={deg} className="legalbook__stamp-mark" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <image href="/assets/legal/az-mark-brass.png" x="69" y="44" width="62" height="62" preserveAspectRatio="xMidYMid meet" />
      <line className="legalbook__stamp-mark" x1="72" y1="108" x2="128" y2="108" strokeWidth="0.75" />
      <text className="legalbook__stamp-text" x="100" y="124" textAnchor="middle">
        OFFICIAL DOCUMENT
      </text>
      <text className="legalbook__stamp-text" x="100" y="136" textAnchor="middle">
        AIIT.NETWORK
      </text>
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: 'prev' | 'next' }) {
  const d = direction === 'prev' ? 'M8.5 2 3 7.5 8.5 13M3.5 7.5H16' : 'M7.5 2 13 7.5 7.5 13M12.5 7.5H0';
  return (
    <svg width="16" height="15" viewBox="0 0 16 15" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <div className="legalbook__section" key={section.id}>
      <h3 className="legalbook__section-title">{section.title}</h3>
      {section.lead && <p className="legalbook__lead">{section.lead}</p>}
      {section.groups && (
        <div className="legalbook__groups">
          {section.groups.map((g) => (
            <div className="legalbook__group" key={g.label ?? g.items[0]}>
              {g.label && <p className="legalbook__group-label">{g.label}</p>}
              <ul className="legalbook__list">
                {g.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {section.items && (
        <ul className="legalbook__list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {section.paragraphs?.map((p) => (
        <p key={p}>{linkifyEmail(p)}</p>
      ))}
      {section.clause && (
        <p className="legalbook__clause">
          <span className="legalbook__clause-label">Key clause</span>
          {section.clause}
        </p>
      )}
    </div>
  );
}

/**
 * A legal document (Terms & Conditions, Privacy Policy) as an interactive
 * book: a cover, then one page at a time behind a book-like page-turn
 * transition, with 2 decorative leaves stacked behind the active one for
 * depth. Shared by both /terms and /privacy-policy (see LegalPage.tsx) --
 * each passes its own LegalDoc plus its own LegalBookPage[] pagination
 * (termsBookPages.ts / privacyBookPages.ts), since the two documents'
 * sections carry very different amounts of content.
 *
 * The book viewer is a fixed-size stage: every leaf (cover included)
 * renders at the same width/height regardless of how much content it
 * holds, so paging never moves the viewport or the surrounding page --
 * only the leaf's own body area ever scrolls, and only if a page's
 * content genuinely can't fit (see legal-book.css for the height and
 * the .legalbook__page-body overflow rule).
 */
export function LegalBook({ doc, pages }: { doc: LegalDoc; pages: LegalBookPage[] }) {
  // page 0 = cover, 1..N = pages (1-indexed to match the visible "01/N").
  const total = pages.length;
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const reduced = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tocId = useId();
  useScrollReveal();

  const sectionsById = useMemo(() => {
    const map = new Map<string, LegalSection>();
    doc.sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [doc.sections]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total, next));
      setPage((prev) => {
        if (clamped === prev) return prev;
        setDirection(clamped > prev ? 'next' : 'prev');
        setAnimKey((k) => k + 1);
        return clamped;
      });
    },
    [total],
  );

  const goNext = useCallback(() => goTo(page + 1), [goTo, page]);
  const goPrev = useCallback(() => goTo(page - 1), [goTo, page]);

  // Focus the new page's heading and announce it -- page changes are real
  // navigation, not just a visual flourish, so screen readers and keyboard
  // users need the same signal sighted users get from the animation. The
  // leaf itself never scrolls the viewport when this runs (no scrollIntoView
  // anywhere in this component) -- that's the whole point of a fixed stage.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const label = page === 0 ? `Cover, ${doc.title}` : `Page ${page} of ${total}, ${pages[page - 1].label}`;
    if (liveRef.current) liveRef.current.textContent = label;
  }, [page, total, doc.title, pages]);

  // Keyboard nav (Left/Right/Home/End) while focus is anywhere inside the book.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(total);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, goTo, total]);

  // Swipe (discrete: crosses a distance threshold, not a live drag-follow).
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const bookPage = page > 0 ? pages[page - 1] : null;
  const enterClass = reduced ? 'is-reduced' : direction === 'prev' ? 'is-entering-prev' : 'is-entering-next';

  return (
    <div className="legalbook" ref={rootRef}>
      <div className="container container--wide">
        <header className="legalbook__intro" data-reveal>
          <p className="eyebrow legalbook__eyebrow">{doc.eyebrow}</p>
          <p className="legalbook__intro-text">{doc.intro}</p>
        </header>

        <div className="legalbook__stage" data-reveal>
          <button
            type="button"
            className="legalbook__arrow legalbook__arrow--prev"
            onClick={goPrev}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ArrowIcon direction="prev" />
          </button>

          <div className="legalbook__book">
            <div className="legalbook__toc-wrap">
              <button
                type="button"
                className="legalbook__toc-toggle"
                aria-expanded={tocOpen}
                aria-controls={`${tocId}-panel`}
                onClick={() => setTocOpen((o) => !o)}
              >
                Contents
                <svg
                  className={cn('legalbook__toc-chevron', tocOpen && 'is-open')}
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {tocOpen && (
                <div className="legalbook__toc-panel" id={`${tocId}-panel`}>
                  <ol>
                    <li>
                      <button type="button" className={page === 0 ? 'is-active' : undefined} onClick={() => { goTo(0); setTocOpen(false); }}>
                        <span className="legalbook__toc-num">·</span>
                        Cover
                      </button>
                    </li>
                    {pages.map((p, i) => (
                      <li key={p.label}>
                        <button
                          type="button"
                          className={page === i + 1 ? 'is-active' : undefined}
                          onClick={() => {
                            goTo(i + 1);
                            setTocOpen(false);
                          }}
                        >
                          <span className="legalbook__toc-num">{folio(i)}</span>
                          {p.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="legalbook__leaves">
              <div className="legalbook__leaf legalbook__leaf--back-2" aria-hidden="true">
                <RuledMark />
              </div>
              <div className="legalbook__leaf legalbook__leaf--back-1" aria-hidden="true">
                <RuledMark />
              </div>

              <div
                className={cn('legalbook__leaf', 'legalbook__leaf--active', enterClass, page === 0 && 'is-cover')}
                key={animKey}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <Stamp />
                {page === 0 ? (
                  <div className="legalbook__cover">
                    <Logo variant="dark" className="legalbook__cover-logo" />
                    <div className="legalbook__cover-rule" aria-hidden="true" />
                    <h1 className="legalbook__cover-title" ref={headingRef} tabIndex={-1}>
                      {doc.title}
                    </h1>
                    <p className="legalbook__cover-effective">
                      {doc.effectiveLabel}: {doc.effectiveDate}
                    </p>
                    <p className="legalbook__cover-hint">{doc.intro}</p>
                    {/* Mobile-only (see the CSS) -- the Previous/Next arrow
                        buttons are hidden below 560px to give the reading
                        column more width (legal-book.css), leaving swipe as
                        the only gesture-based way to turn pages there (the
                        keyboard handler above still works too, but doesn't
                        apply on a touchscreen). Cover-only, not repeated on
                        every page, since it only needs to teach the gesture
                        once. */}
                    <p className="legalbook__swipe-hint" aria-hidden="true">
                      <span className="legalbook__swipe-hint-arrows">
                        <ArrowIcon direction="next" />
                      </span>
                      Swipe to begin reading
                    </p>
                  </div>
                ) : (
                  <article className="legalbook__page" aria-labelledby={`${tocId}-heading`}>
                    <div className="legalbook__page-head">
                      <span className="legalbook__folio">{folio(page - 1)}</span>
                      <h2 className="legalbook__page-title" id={`${tocId}-heading`} ref={headingRef} tabIndex={-1}>
                        {bookPage!.label}
                      </h2>
                    </div>
                    <div
                      className={cn(
                        'legalbook__page-body',
                        bookPage!.layout === 'two-col' && 'legalbook__page-body--two-col',
                      )}
                    >
                      {bookPage!.sectionIds.map((id) => {
                        const section = sectionsById.get(id);
                        return section ? <SectionBody section={section} key={id} /> : null;
                      })}
                      {page === total &&
                        doc.closing.map((line) => (
                          <p className="legalbook__closing" key={line}>
                            {linkifyEmail(line)}
                          </p>
                        ))}
                    </div>
                  </article>
                )}

                <p className="legalbook__page-foot">
                  AIIT.NETWORK <span aria-hidden="true">·</span>{' '}
                  {page === 0 ? doc.title.toUpperCase() : `${folio(page - 1)} / ${folio(total - 1)}`}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="legalbook__arrow legalbook__arrow--next"
            onClick={goNext}
            disabled={page === total}
            aria-label="Next page"
          >
            <ArrowIcon direction="next" />
          </button>
        </div>

        <div className="visually-hidden" role="status" aria-live="polite" ref={liveRef} />
      </div>
    </div>
  );
}
