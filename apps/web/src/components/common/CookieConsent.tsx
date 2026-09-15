import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCookieConsent } from '@/lib/CookieConsentContext';
import type { CookieConsentChoices } from '@/lib/CookieConsentContext';
import { cn } from '@/lib/cn';
import './cookie-consent.css';

/** Whether the panel's one-time delayed slide-up entrance has already
 * played this page load -- a plain module-level flag, not React state,
 * so it survives the panel unmounting (dismissed) and remounting later
 * (reopened from the footer) within the same session, and correctly
 * resets on an actual page reload (a fresh module evaluation). A later
 * open (footer link, or re-showing after dismiss) should feel like an
 * immediate response to that click, not repeat the slow reveal. */
let hasPlayedEntrance = false;

interface CategoryInfo {
  key: keyof CookieConsentChoices;
  title: string;
  body: string;
}

/** Copy matches privacy.ts's "Cookies and tracking" section labels 1:1. */
const CATEGORIES: CategoryInfo[] = [
  {
    key: 'analytics',
    title: 'Analytics cookies',
    body: 'Help us understand how visitors use the platform.',
  },
  {
    key: 'preferences',
    title: 'Preference cookies',
    body: 'Remember your settings and choices.',
  },
];

/** A restrained, hand-drawn line-art sprig -- the panel's one decorative
 * touch, echoing the site's other thin-stroke abstract marks (the terms
 * book's RuledMark, the homepage globe) rather than a literal cookie
 * icon or emoji. */
function LeafMark() {
  return (
    <svg className="cookie-panel__leaf" viewBox="0 0 40 44" aria-hidden="true" focusable="false">
      <path d="M20 42V6" />
      <path d="M20 8c-7 0-11.5 5-12.5 10.5C14.5 18.5 20 13.5 20 8Z" />
      <path d="M20 17c7.5 0 12.5 5.5 13.5 11.5C26 28.5 20 23 20 17Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="cookie-panel__manage-arrow" width="13" height="10" viewBox="0 0 13 10" aria-hidden="true">
      <path d="M8 1.2 12 5l-4 3.8M12 5H0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn('cookie-toggle', checked && 'is-on', disabled && 'is-locked')}
      onClick={() => onChange?.(!checked)}
    >
      <span className="cookie-toggle__track" aria-hidden="true">
        <span className="cookie-toggle__thumb" />
      </span>
    </button>
  );
}

function Eyebrow() {
  return <p className="cookie-panel__eyebrow">Privacy &amp; Cookies</p>;
}

function CookiePanel({ expanded }: { expanded: boolean }) {
  const { choices, acceptAll, rejectNonEssential, savePreferences, openPreferences, closePreferences, dismissBanner } =
    useCookieConsent();
  const [draft, setDraft] = useState<CookieConsentChoices>(choices ?? { analytics: false, preferences: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [entranceClass] = useState(() => (hasPlayedEntrance ? 'cookie-panel--quick' : 'cookie-panel--auto'));

  const closeAction = choices === null ? dismissBanner : closePreferences;

  useEffect(() => {
    hasPlayedEntrance = true;
  }, []);

  useEffect(() => {
    if (expanded) setDraft(choices ?? { analytics: false, preferences: false });
  }, [expanded, choices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAction();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) closeAction();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeAction]);

  return (
    <div className="cookie-panel">
      <div
        className={cn('cookie-panel__card', expanded && 'is-expanded', entranceClass)}
        role="region"
        aria-label={expanded ? 'Cookie preferences' : 'Privacy and cookies notice'}
        ref={cardRef}
      >
        <span className="cookie-panel__spine" aria-hidden="true" />
        <button type="button" className="cookie-panel__close" aria-label="Dismiss" ref={closeRef} onClick={closeAction}>
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
            <path d="M2 2l9 9M11 2 2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        {expanded ? (
          <div className="cookie-panel__expanded">
            <div className="cookie-panel__side">
              <Eyebrow />
              <h2 className="cookie-panel__heading">Cookie preferences</h2>
              <p className="cookie-panel__body">
                Choose how we use cookies on AIIT.NETWORK. You can update your preferences at any time from the
                footer.
              </p>
              <LeafMark />
            </div>

            <div className="cookie-panel__main">
              <ul className="cookie-panel__list">
                <li className="cookie-panel__row">
                  <span className="cookie-panel__row-dot" aria-hidden="true" />
                  <div className="cookie-panel__row-text">
                    <span className="cookie-panel__row-title">Essential cookies</span>
                    <span className="cookie-panel__row-body">Required for the website to function properly.</span>
                  </div>
                  <div className="cookie-panel__row-control">
                    <Toggle label="Essential cookies" checked disabled />
                    <span className="cookie-panel__row-locked">Always active</span>
                  </div>
                </li>
                {CATEGORIES.map((c) => (
                  <li className="cookie-panel__row" key={c.key}>
                    <span className="cookie-panel__row-dot" aria-hidden="true" />
                    <div className="cookie-panel__row-text">
                      <span className="cookie-panel__row-title">{c.title}</span>
                      <span className="cookie-panel__row-body">{c.body}</span>
                    </div>
                    <div className="cookie-panel__row-control">
                      <Toggle
                        label={c.title}
                        checked={draft[c.key]}
                        onChange={(next) => setDraft((d) => ({ ...d, [c.key]: next }))}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cookie-panel__actions">
                <button type="button" className="cookie-panel__btn cookie-panel__btn--secondary" onClick={closeAction}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="cookie-panel__btn cookie-panel__btn--primary"
                  onClick={() => savePreferences(draft)}
                >
                  Save preferences
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="cookie-panel__header">
              <Eyebrow />
              <LeafMark />
            </div>
            <h2 className="cookie-panel__heading">Your privacy matters.</h2>
            <p className="cookie-panel__body">
              We use cookies to improve your experience, understand how the website is used, and remember your
              preferences.
            </p>
            <button type="button" className="cookie-panel__manage-link" onClick={openPreferences}>
              Manage preferences
              <ArrowIcon />
            </button>
            <div className="cookie-panel__actions">
              <button type="button" className="cookie-panel__btn cookie-panel__btn--secondary" onClick={rejectNonEssential}>
                Necessary only
              </button>
              <button type="button" className="cookie-panel__btn cookie-panel__btn--primary" onClick={acceptAll}>
                Accept all
              </button>
            </div>
            <p className="cookie-panel__fineprint">
              <Link to="/privacy-policy" onClick={closeAction}>
                Privacy Policy
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Mounted once, globally (see App.tsx) so it survives route changes and
 * shows on every page, portal included. Renders nothing once a decision
 * exists and nothing has reopened the preferences panel. */
export function CookieConsent() {
  const { bannerOpen, preferencesOpen } = useCookieConsent();
  if (!bannerOpen && !preferencesOpen) return null;
  return <CookiePanel expanded={preferencesOpen} />;
}
