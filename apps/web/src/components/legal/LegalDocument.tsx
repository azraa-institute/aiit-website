import { useEffect, useRef, useState } from 'react';
import type { LegalDoc } from '@/data/legal/types';
import { useScrollReveal } from '@/lib/useScrollReveal';
import './legal-document.css';

function folio(i: number): string {
  return String(i + 1).padStart(2, '0');
}

/** Abstract, non-cliché page marks — concentric scope rings for Privacy, ruled document lines for Terms. */
function PageMark({ kind }: { kind: 'privacy' | 'terms' }) {
  if (kind === 'privacy') {
    return (
      <svg className="manuscript__mark" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <circle cx="150" cy="60" r="18" />
        <circle cx="150" cy="60" r="42" />
        <circle cx="150" cy="60" r="68" />
        <circle cx="150" cy="60" r="96" />
      </svg>
    );
  }
  return (
    <svg className="manuscript__mark" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <line x1="60" y1="30" x2="190" y2="30" />
      <line x1="60" y1="58" x2="175" y2="58" />
      <line x1="60" y1="86" x2="185" y2="86" />
      <line x1="60" y1="114" x2="150" y2="114" />
      <line x1="60" y1="142" x2="180" y2="142" />
    </svg>
  );
}

/**
 * The shared reading experience for legal documents: a restrained editorial
 * hero, a slim collapsible contents rail, and a single comfortably-measured
 * document column — not a narrow multi-column page.
 */
export function LegalDocument({ doc, kind }: { doc: LegalDoc; kind: 'privacy' | 'terms' }) {
  const [activeId, setActiveId] = useState(doc.sections[0]?.id ?? '');
  const [tocOpen, setTocOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollReveal([doc]);

  useEffect(() => {
    const nodes = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-manuscript-section]') ?? [],
    );
    if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveId(top.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [doc]);

  const activeSection = doc.sections.find((s) => s.id === activeId) ?? doc.sections[0];

  return (
    <div className="manuscript" ref={rootRef}>
      <header className={`manuscript__cover manuscript__cover--${kind}`}>
        <PageMark kind={kind} />
        <div className="container container--wide" data-reveal>
          <p className="eyebrow manuscript__eyebrow">{doc.eyebrow}</p>
          <h1 className="manuscript__title">{doc.title}</h1>
          <p className="manuscript__intro">{doc.intro}</p>
          <p className="manuscript__meta">
            {doc.effectiveLabel} {doc.effectiveDate}
          </p>
        </div>
      </header>

      <div className="container container--wide manuscript__body">
        <nav className="manuscript__toc" aria-label="Table of contents">
          <button
            type="button"
            className="manuscript__toc-toggle"
            aria-expanded={tocOpen}
            aria-controls="toc-panel"
            onClick={() => setTocOpen((o) => !o)}
          >
            <span className="manuscript__toc-toggle-text">
              <span className="manuscript__toc-toggle-label">On this page</span>
              <span className="manuscript__toc-toggle-current">{activeSection?.title}</span>
            </span>
            <svg
              className={`manuscript__toc-chevron ${tocOpen ? 'is-open' : ''}`}
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="manuscript__toc-panel" id="toc-panel" data-open={tocOpen || undefined}>
            <div className="manuscript__toc-panel-inner">
              <p className="manuscript__toc-label">Contents</p>
              <ol>
                {doc.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={s.id === activeId ? 'is-active' : undefined}
                      onClick={() => setTocOpen(false)}
                    >
                      <span className="manuscript__toc-num">{folio(i)}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </nav>

        <div className="manuscript__pages">
          {activeSection && <p className="manuscript__runninghead">{activeSection.title}</p>}

          <div className="manuscript__sheet">
            {doc.sections.map((s, i) => (
              <section id={s.id} key={s.id} className="manuscript__section" data-manuscript-section>
                <div className="manuscript__section-head">
                  <span className="manuscript__folio" aria-hidden="true">
                    {folio(i)}
                  </span>
                  <h2 className="manuscript__heading">{s.title}</h2>
                </div>

                <div className="manuscript__section-body">
                  {s.lead && <p className="manuscript__lead">{s.lead}</p>}

                  {s.groups?.map((g) => (
                    <div className="manuscript__group" key={g.label ?? g.items[0]}>
                      {g.label && <p className="manuscript__group-label">{g.label}</p>}
                      <ul className="manuscript__list">
                        {g.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {s.items && (
                    <ul className="manuscript__list">
                      {s.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}

                  {s.clause && (
                    <p className="manuscript__clause">
                      <span className="manuscript__clause-label">Key clause</span>
                      {s.clause}
                    </p>
                  )}
                </div>
              </section>
            ))}

            <footer className="manuscript__colophon">
              {doc.closing.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
