import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { LegalDoc, LegalSection } from '@/data/legal/types';
import { TERMS_BOOK_PAGES } from '@/data/legal/termsBookPages';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/layout/Logo';
import './terms-book.css';

function folio(i: number): string {
  return String(i + 1).padStart(2, '0');
}

/** The same abstract ruled-line page mark LegalDocument's cover uses for
 * Terms — reused here (not reinvented) for the decoy pages behind the
 * active leaf, so a page reads as "a document" without rendering real
 * upcoming text twice. */
function RuledMark() {
  return (
    <svg className="termsbook__ruled" viewBox="0 0 200 120" aria-hidden="true" focusable="false">
      <line x1="20" y1="14" x2="180" y2="14" />
      <line x1="20" y1="34" x2="160" y2="34" />
      <line x1="20" y1="54" x2="170" y2="54" />
      <line x1="20" y1="74" x2="130" y2="74" />
      <line x1="20" y1="94" x2="150" y2="94" />
    </svg>
  );
}

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <div className="termsbook__section" key={section.id}>
      <h3 className="termsbook__section-title">{section.title}</h3>
      {section.lead && <p className="termsbook__lead">{section.lead}</p>}
      {section.groups?.map((g) => (
        <div className="termsbook__group" key={g.label ?? g.items[0]}>
          {g.label && <p className="termsbook__group-label">{g.label}</p>}
          <ul className="termsbook__list">
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {section.items && (
        <ul className="termsbook__list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {section.paragraphs?.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {section.clause && (
        <p className="termsbook__clause">
          <span className="termsbook__clause-label">Key clause</span>
          {section.clause}
        </p>
      )}
    </div>
  );
}

/**
 * The Terms & Conditions page as an interactive document: a cover, then
 * one legal page at a time behind a book-like page-turn transition, with
 * 2 decorative leaves stacked behind the active one for depth. Terms-only
 * (see LegalPage.tsx) -- Privacy Policy keeps the conventional scrolling
 * LegalDocument reading experience.
 */
export function TermsBook({ doc }: { doc: LegalDoc }) {
  // page 0 = cover, 1..N = TERMS_BOOK_PAGES (1-indexed to match the visible "01/12").
  const total = TERMS_BOOK_PAGES.length;
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
  // users need the same signal sighted users get from the animation.
  useEffect(() => {
    headingRef.current?.focus();
    const label = page === 0 ? `Cover, ${doc.title}` : `Page ${page} of ${total}, ${TERMS_BOOK_PAGES[page - 1].label}`;
    if (liveRef.current) liveRef.current.textContent = label;
  }, [page, total, doc.title]);

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

  const bookPage = page > 0 ? TERMS_BOOK_PAGES[page - 1] : null;
  const enterClass = reduced ? 'is-reduced' : direction === 'prev' ? 'is-entering-prev' : 'is-entering-next';

  return (
    <div className="termsbook" ref={rootRef}>
      <div className="container container--wide">
        <header className="termsbook__intro" data-reveal>
          <p className="eyebrow termsbook__eyebrow">{doc.eyebrow}</p>
          <p className="termsbook__intro-text">{doc.intro}</p>
        </header>

        <div className="termsbook__stage" data-reveal>
          <div className="termsbook__leaves">
            <div className="termsbook__leaf termsbook__leaf--back-2" aria-hidden="true">
              <RuledMark />
            </div>
            <div className="termsbook__leaf termsbook__leaf--back-1" aria-hidden="true">
              <RuledMark />
            </div>

            <div
              className={cn('termsbook__leaf', 'termsbook__leaf--active', enterClass)}
              key={animKey}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {page === 0 ? (
                <div className="termsbook__cover">
                  <Logo variant="dark" className="termsbook__cover-logo" />
                  <p className="termsbook__cover-kicker">Azraa Institute of Information Technology</p>
                  <div className="termsbook__cover-rule" aria-hidden="true" />
                  <h1 className="termsbook__cover-title" ref={headingRef} tabIndex={-1}>
                    Website Terms
                    <br />
                    &amp; Conditions
                  </h1>
                  <p className="termsbook__cover-effective">
                    {doc.effectiveLabel}: {doc.effectiveDate}
                  </p>
                  <p className="termsbook__cover-hint">{doc.intro}</p>
                </div>
              ) : (
                <article className="termsbook__page" aria-labelledby={`${tocId}-heading`}>
                  <div className="termsbook__page-head">
                    <span className="termsbook__folio">{folio(page - 1)}</span>
                    <h2 className="termsbook__page-title" id={`${tocId}-heading`} ref={headingRef} tabIndex={-1}>
                      {bookPage!.label}
                    </h2>
                  </div>
                  <div className="termsbook__page-body">
                    {bookPage!.sectionIds.map((id) => {
                      const section = sectionsById.get(id);
                      return section ? <SectionBody section={section} key={id} /> : null;
                    })}
                    {page === total &&
                      doc.closing.map((line) => (
                        <p className="termsbook__closing" key={line}>
                          {line}
                        </p>
                      ))}
                  </div>
                  <p className="termsbook__page-foot">
                    AIIT.NETWORK <span aria-hidden="true">·</span> {folio(page - 1)} / {folio(total - 1)}
                  </p>
                </article>
              )}
            </div>
          </div>
        </div>

        <nav className="termsbook__controls" aria-label="Document pages">
          <button
            type="button"
            className="termsbook__nav-btn"
            onClick={goPrev}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <svg width="15" height="10" viewBox="0 0 15 10" aria-hidden="true">
              <path
                d="M5.5 1 1 5l4.5 4M1.5 5H14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Previous</span>
          </button>

          <span className="termsbook__counter" aria-hidden="true">
            {page === 0 ? 'Cover' : `${folio(page - 1)} / ${folio(total - 1)}`}
          </span>

          <div className="termsbook__toc-wrap">
            <button
              type="button"
              className="termsbook__toc-toggle"
              aria-expanded={tocOpen}
              aria-controls={`${tocId}-panel`}
              onClick={() => setTocOpen((o) => !o)}
            >
              Contents
              <svg
                className={cn('termsbook__toc-chevron', tocOpen && 'is-open')}
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
              <div className="termsbook__toc-panel" id={`${tocId}-panel`}>
                <ol>
                  <li>
                    <button type="button" className={page === 0 ? 'is-active' : undefined} onClick={() => { goTo(0); setTocOpen(false); }}>
                      <span className="termsbook__toc-num">·</span>
                      Cover
                    </button>
                  </li>
                  {TERMS_BOOK_PAGES.map((p, i) => (
                    <li key={p.label}>
                      <button
                        type="button"
                        className={page === i + 1 ? 'is-active' : undefined}
                        onClick={() => {
                          goTo(i + 1);
                          setTocOpen(false);
                        }}
                      >
                        <span className="termsbook__toc-num">{folio(i)}</span>
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <button
            type="button"
            className="termsbook__nav-btn"
            onClick={goNext}
            disabled={page === total}
            aria-label="Next page"
          >
            <span>Next</span>
            <svg width="15" height="10" viewBox="0 0 15 10" aria-hidden="true">
              <path
                d="M9.5 1 14 5l-4.5 4M13.5 5H1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </nav>

        <div className="visually-hidden" role="status" aria-live="polite" ref={liveRef} />
      </div>
    </div>
  );
}
