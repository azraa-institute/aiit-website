import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { searchSite, splitMatch, SEARCH_TYPE_ORDER, type SearchType } from '@/lib/siteSearch';
import './site-search.css';

interface SiteSearchProps {
  open: boolean;
  onClose: () => void;
}

/** Curated shortcuts shown before the visitor types. */
const HINTS = ['AI Engineering', 'Cloud Computing', 'Cyber Security', 'AIIT Blueprint', 'Certification'];

/** Group heading shown per result type. */
const GROUP_LABEL: Record<SearchType, string> = {
  Course: 'Courses',
  Article: 'Resources',
  Page: 'Pages',
  FAQ: 'FAQs',
};

const CLOSE_MS = 360;

/**
 * The site search surface. It opens and closes with an "aperture" animation
 * anchored to the navbar search icon's position. Search logic and the
 * keyboard model live in siteSearch.ts.
 */
export function SiteSearch({ open, onClose }: SiteSearchProps) {
  const reduced = useReducedMotion();

  // Two-phase lifecycle so the close animation can play before unmount.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0 });
  const navigate = useNavigate();

  useLockBodyScroll(mounted);

  const results = useMemo(() => (mounted ? searchSite(term) : []), [term, mounted]);
  const grouped = useMemo(() => {
    const map = new Map<SearchType, typeof results>();
    for (const r of results) {
      const arr = map.get(r.type) ?? [];
      arr.push(r);
      map.set(r.type, arr);
    }
    return SEARCH_TYPE_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!] as const);
  }, [results]);

  /* Keyboard navigation walks the results in the exact order they are rendered
     (grouped by type), so the highlighted row and the row Enter opens are
     always the same one. */
  const flatResults = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  const typing = term.trim().length >= 2;

  useEffect(() => setActive(0), [term]);

  /* ---- Open / close lifecycle ---- */
  useEffect(() => {
    if (open) {
      const btn = document.querySelector<HTMLElement>('.site-header__search-toggle');
      const r = btn?.getBoundingClientRect();
      origin.current = r
        ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        : { x: window.innerWidth - 56, y: 40 };
      setTerm('');
      setActive(0);
      setMounted(true);
      // double rAF so the browser paints the closed state before .is-entered
      // flips it — otherwise the aperture transition is skipped.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true));
      });
      const focusId = window.setTimeout(() => inputRef.current?.focus(), reduced ? 0 : 130);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        window.clearTimeout(focusId);
      };
    }
    // closing
    setEntered(false);
    const btn = document.querySelector<HTMLElement>('.site-header__search-toggle');
    const unmount = window.setTimeout(() => setMounted(false), reduced ? 0 : CLOSE_MS);
    const refocus = window.setTimeout(() => btn?.focus(), reduced ? 0 : CLOSE_MS);
    return () => {
      window.clearTimeout(unmount);
      window.clearTimeout(refocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---- Keyboard: Esc / arrows / enter + a light focus trap ---- */
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(flatResults.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const r = flatResults[active];
        if (r) {
          onClose();
          navigate(r.to);
        }
      } else if (e.key === 'Tab') {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        );
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, flatResults, active, navigate, onClose]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = useCallback(
    (to: string) => {
      onClose();
      navigate(to);
    },
    [onClose, navigate],
  );

  if (!mounted) return null;

  let flatIndex = -1;

  return (
    <div
      className={`site-search${entered ? ' is-entered' : ''}`}
      style={{ '--ox': `${origin.current.x}px`, '--oy': `${origin.current.y}px` } as React.CSSProperties}
    >
      <button className="site-search__scrim" aria-label="Close search" tabIndex={-1} onClick={onClose} />

      <div
        className="site-search__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-search-label"
        ref={panelRef}
      >
        <span className="site-search__trace" aria-hidden="true" />

        <div className="site-search__head">
          <p className="site-search__label" id="site-search-label">
            Search AIIT
          </p>
          <button className="site-search__esc" onClick={onClose} aria-label="Close search">
            <kbd>Esc</kbd>
          </button>
        </div>

        <div className="site-search__field">
          <svg className="site-search__glass" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search courses, resources and pages"
            aria-label="Search the site"
            aria-controls="site-search-results"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className="site-search__underline" aria-hidden="true" />
        </div>

        <div className="site-search__body" id="site-search-results" ref={listRef}>
          {!typing ? (
            <div className="site-search__try">
              <p className="site-search__try-label">Try</p>
              <ul role="list">
                {HINTS.map((h, i) => (
                  <li key={h} style={{ '--i': i } as React.CSSProperties}>
                    <button className="site-search__suggestion" onClick={() => setTerm(h)}>
                      <span>{h}</span>
                      <svg width="14" height="9" viewBox="0 0 14 9" aria-hidden="true">
                        <path
                          d="M9 1l4 3.5L9 8M13 4.5H1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : results.length === 0 ? (
            <div className="site-search__empty">
              <p className="site-search__empty-title">No matching results</p>
              <p className="site-search__empty-sub">Try another search term.</p>
            </div>
          ) : (
            <div className="site-search__groups">
              {grouped.map(([type, items]) => (
                <section key={type} className="site-search__group">
                  <p className="site-search__group-label">{GROUP_LABEL[type]}</p>
                  <ul role="list">
                    {items.map((r) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      const [before, hit, after] = splitMatch(r.title, term);
                      return (
                        <li key={r.id} style={{ '--i': idx } as React.CSSProperties}>
                          <button
                            className="site-search__result"
                            data-active={active === idx}
                            onMouseMove={() => setActive(idx)}
                            onClick={() => pick(r.to)}
                          >
                            <span className="site-search__result-title">
                              {before}
                              <mark>{hit}</mark>
                              {after}
                            </span>
                            {r.subtitle && <span className="site-search__result-sub">{r.subtitle}</span>}
                            <span className="site-search__result-type">{r.type}</span>
                            <svg
                              className="site-search__result-arrow"
                              width="15"
                              height="10"
                              viewBox="0 0 15 10"
                              aria-hidden="true"
                            >
                              <path
                                d="M9.5 1l4 4-4 4M13.5 5H1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
