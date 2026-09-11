import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import './enrollment-popup.css';

const SEEN_KEY = 'aiit.enroll.popup.seen';
const DELAY_MS = 2600;
/** Routes where an enrolment promo would be redundant or intrusive.
 *  `/resources` is excluded so the promo never interrupts an article the
 *  reader has just started — the newsletter band at the end of each piece
 *  is the non-intrusive path there. */
const SKIP_PREFIXES = ['/login', '/register', '/forgot-password', '/portal', '/resources'];
/** Enrolment currently routes to the register page (no checkout yet). */
const ENROLL_ROUTE = '/register';

export function EnrollmentPopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (skip) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* storage unavailable */
    }
    if (seen) return;
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, [skip]);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage unavailable */
    }
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>('a[href], button');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const goEnroll = () => {
    setOpen(false);
    navigate(ENROLL_ROUTE);
  };

  return (
    <div className="enroll-pop" onClick={() => setOpen(false)}>
      <div
        className="enroll-pop__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-pop-title"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="enroll-pop__close"
          aria-label="Close"
          ref={closeRef}
          onClick={() => setOpen(false)}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <p id="enroll-pop-title" className="visually-hidden">
          AIIT admissions are open — enrol now
        </p>

        <div className="enroll-pop__figure">
          <img
            src="/assets/popups/aiit-enrollement.webp"
            width={887}
            height={1774}
            alt="Smiling AIIT students. Admissions for the 2026 intake are open."
            loading="lazy"
            decoding="async"
          />
          {/* transparent hotspot over the embedded "Enroll Now" area */}
          <a
            className="enroll-pop__hotspot"
            href={ENROLL_ROUTE}
            onClick={(e) => {
              e.preventDefault();
              goEnroll();
            }}
            aria-label="Enrol now at AIIT"
          />
        </div>

        <p className="enroll-pop__script">
          Your journey starts here&nbsp;&mdash;&nbsp;<span>Enroll&nbsp;Now</span>
        </p>
      </div>
    </div>
  );
}
