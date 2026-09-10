import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE } from '@/data/site';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/cn';
import './floating-actions.css';

const WA_NUMBER = SITE.contact.whatsapp.replace(/[^\d]/g, '');
const WA_TEXT = encodeURIComponent(
  "Hello AIIT, I'd like to know more about your courses.",
);

const TOP_BUTTON_THRESHOLD = 200;

/** Ring geometry — a viewBox-agnostic radius so stroke-dasharray/offset are
 *  computed once and reused for both the desktop and mobile sizes (the CSS
 *  simply scales the whole SVG down; the underlying percentages stay exact). */
const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Ease-out: moves immediately on click, then settles smoothly. */
function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

/** Persistent WhatsApp contact button + a "Scroll Progress Orb" back-to-top
 *  control that tracks real document scroll position. Bottom-right, every page. */
export function FloatingActions() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  const scrollAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? Math.min(Math.max(scrollTop / scrollable, 0), 1) : 0;
      setProgress(pct);
      setVisible(scrollTop > TOP_BUTTON_THRESHOLD);
      rafRef.current = null;
    };
    const onScroll = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goToTop = useCallback(() => {
    if (scrollAnimRef.current != null) cancelAnimationFrame(scrollAnimRef.current);

    const startY = window.scrollY;
    if (startY <= 0) return;

    if (reduced) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    const duration = Math.min(620, Math.max(300, startY * 0.3));
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // `instant` per frame: the page sets `scroll-behavior: smooth` globally, and
      // without this each frame's scrollTo would kick off a *native* smooth-scroll
      // that fights this loop and makes the button feel laggy on click.
      window.scrollTo({ top: Math.round(startY * (1 - easeOutQuart(t))), behavior: 'instant' });
      if (t < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
      }
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  }, [reduced]);

  useEffect(() => () => {
    if (scrollAnimRef.current != null) cancelAnimationFrame(scrollAnimRef.current);
  }, []);

  const dashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="floating-actions">
      <button
        type="button"
        className={cn('scroll-orb', visible && 'is-visible')}
        aria-label="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={goToTop}
      >
        <span className="floating-actions__tip" aria-hidden="true">
          Back to top
        </span>
        <svg className="scroll-orb__ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle className="scroll-orb__ring-track" cx="24" cy="24" r={RING_RADIUS} />
          <circle
            className="scroll-orb__ring-progress"
            cx="24"
            cy="24"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <span className="scroll-orb__core">
          <svg
            className="scroll-orb__arrow"
            width="15"
            height="15"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M8 13.5V3M3.5 7 8 2.5 12.5 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <a
        className="wa-orb"
        href={`https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with AIIT on WhatsApp"
      >
        <span className="wa-orb__panel" aria-hidden="true">
          <span className="wa-orb__word">WhatsApp</span>
        </span>
        <span className="wa-orb__disc">
          <svg
            className="wa-orb__glyph"
            width="25"
            height="25"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M19.05 4.94A10 10 0 0 0 3.5 17.02L2 22l5.1-1.34a10 10 0 0 0 4.78 1.22h.01A10 10 0 0 0 19.05 4.94Zm-7.16 15.4h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.03.79.81-2.95-.2-.31a8.32 8.32 0 1 1 15.42-4.42 8.33 8.33 0 0 1-8.27 8.32Zm4.56-6.23c-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.12-.17.25-.65.81-.79.98-.15.16-.29.18-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.13.16 1.75 2.66 4.23 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.14-1.19-.06-.1-.23-.16-.48-.29Z" />
          </svg>
        </span>
      </a>
    </div>
  );
}
