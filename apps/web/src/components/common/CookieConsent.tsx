import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCookieConsent } from '@/lib/CookieConsentContext';
import type { CookieConsentChoices } from '@/lib/CookieConsentContext';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';
import './cookie-consent.css';

interface CategoryInfo {
  key: keyof CookieConsentChoices;
  title: string;
  body: string;
}

/** Copy matches privacy.ts's "Cookies and tracking" section labels
 * 1:1 -- Essential/Analytics/Preference cookies -- so the banner, the
 * preferences modal and the policy text never describe three different
 * things under the same name. */
const CATEGORIES: CategoryInfo[] = [
  {
    key: 'analytics',
    title: 'Analytics cookies',
    body: 'Help us understand visitor behaviour and improve the platform.',
  },
  {
    key: 'preferences',
    title: 'Preference cookies',
    body: 'Remember your settings, such as language or display choices.',
  },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn('cookie-toggle', checked && 'is-on')}
      onClick={() => onChange(!checked)}
    >
      <span className="cookie-toggle__track" aria-hidden="true">
        <span className="cookie-toggle__thumb" />
      </span>
    </button>
  );
}

function CookieBanner() {
  const { acceptAll, rejectNonEssential, openPreferences } = useCookieConsent();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    barRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" ref={barRef}>
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          <span id="cookie-banner-title" className="cookie-banner__title">
            Cookies on AIIT.Network
          </span>
          We use essential cookies to run the site, and, with your permission, analytics and preference cookies to
          improve it.{' '}
          <Link to="/privacy-policy" className="cookie-banner__link">
            Read our Privacy Policy
          </Link>
          .
        </p>
        <div className="cookie-banner__actions">
          <Button variant="ghost" size="sm" onClick={openPreferences}>
            Manage Preferences
          </Button>
          <Button variant="secondary" size="sm" onClick={rejectNonEssential}>
            Reject Non-Essential
          </Button>
          <Button variant="primary" size="sm" onClick={acceptAll}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}

function CookiePreferencesModal() {
  const { choices, acceptAll, rejectNonEssential, savePreferences, closePreferences } = useCookieConsent();
  const [draft, setDraft] = useState<CookieConsentChoices>(choices ?? { analytics: false, preferences: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLockBodyScroll(true);

  useEffect(() => {
    // Re-sync the draft to whatever's currently saved every time the modal
    // opens (rather than once on mount) -- reopening from the footer after
    // an earlier decision should show that decision, not stale defaults.
    setDraft(choices ?? { analytics: false, preferences: false });
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreferences();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cookie-modal" onClick={closePreferences}>
      <div
        className="cookie-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="cookie-modal__close" aria-label="Close" ref={closeRef} onClick={closePreferences}>
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id="cookie-modal-title" className="cookie-modal__title">
          Cookie Preferences
        </h2>
        <p className="cookie-modal__intro">
          Choose which cookies AIIT.Network can use. Essential cookies keep the site working and can&rsquo;t be
          switched off. See the{' '}
          <Link to="/privacy-policy" className="cookie-banner__link" onClick={closePreferences}>
            Privacy Policy
          </Link>{' '}
          for details.
        </p>

        <ul className="cookie-modal__list">
          <li className="cookie-modal__row">
            <div className="cookie-modal__row-text">
              <span className="cookie-modal__row-title">Essential cookies</span>
              <span className="cookie-modal__row-body">Required for core site functionality. Always active.</span>
            </div>
            <span className="cookie-modal__locked">Always On</span>
          </li>
          {CATEGORIES.map((c) => (
            <li className="cookie-modal__row" key={c.key}>
              <div className="cookie-modal__row-text">
                <span className="cookie-modal__row-title">{c.title}</span>
                <span className="cookie-modal__row-body">{c.body}</span>
              </div>
              <Toggle
                label={c.title}
                checked={draft[c.key]}
                onChange={(next) => setDraft((d) => ({ ...d, [c.key]: next }))}
              />
            </li>
          ))}
        </ul>

        <div className="cookie-modal__actions">
          <Button variant="ghost" size="sm" onClick={rejectNonEssential}>
            Reject Non-Essential
          </Button>
          <Button variant="secondary" size="sm" onClick={acceptAll}>
            Accept All
          </Button>
          <Button variant="primary" size="sm" onClick={() => savePreferences(draft)}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Mounted once, globally (see App.tsx) so it survives route changes and
 * shows on every page, portal included -- cookie consent isn't scoped to
 * the marketing Layout. Renders nothing once a decision exists and the
 * preferences modal isn't open. */
export function CookieConsent() {
  const { bannerOpen, preferencesOpen } = useCookieConsent();
  return (
    <>
      {bannerOpen && !preferencesOpen && <CookieBanner />}
      {preferencesOpen && <CookiePreferencesModal />}
    </>
  );
}
