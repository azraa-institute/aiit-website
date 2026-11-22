import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import './enrollment-popup.css';

const SEEN_KEY = 'aiit.enroll.popup.seen';
const DELAY_MS = 30_000;
/** This promo is only relevant on the webinar landing page itself -- not
 *  the post-registration thank-you page, which already has its own single
 *  CTA (join the WhatsApp group) and shouldn't compete with this one. */
const SHOW_PATH = '/webinar';
/** Enrolment currently routes to the register page (no checkout yet). */
const ENROLL_ROUTE = '/register';

export function EnrollmentPopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const skip = location.pathname !== SHOW_PATH;

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
          AIIT admissions are open. Enrol now
        </p>

        <div className="enroll-pop__figure">
          <img
            src="/assets/popups/aiit-enrollment.webp"
            width={887}
            height={1774}
            alt="Smiling AIIT students. Admissions for the 2027 intake are open."
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
