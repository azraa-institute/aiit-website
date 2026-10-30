import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
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
    body: 'Help us understand how visitors use the platform so we can improve our content and services.',
  },
  {
    key: 'preferences',
    title: 'Preference cookies',
    body: 'Remember your settings and choices, such as language and region.',
  },
];

/** A restrained, hand-drawn line-art mark -- a cookie with a shield-check
 * overlapping it, plus a sparkle -- the panel's one decorative touch,
 * echoing the site's other thin-stroke abstract marks (the terms book's
 * RuledMark, the homepage globe) rather than a literal cookie emoji. */
function CookieShieldMark() {
  return (
    <svg className="cookie-panel__mark" viewBox="0 0 90 68" aria-hidden="true" focusable="false">
      <circle cx="30" cy="38" r="22" />
      <circle cx="22" cy="30" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="35" cy="27" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="44" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="37" cy="46" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="29" cy="39" r="1.6" fill="currentColor" stroke="none" />
      <path d="M58 18 70 22v12c0 9-5 15-12 17-7-2-12-8-12-17V22l12-4Z" />
      <path d="M52 35.5 57 40.5 66 30.5" />
      <path d="M10 18l1.4 4 4 1.4-4 1.4L10 29l-1.4-4-4-1.4 4-1.4Z" />
      <circle cx="76" cy="6" r="1.6" fill="currentColor" stroke="none" />
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

/** The diagonal "opens elsewhere" arrow for the Cookie Policy link --
 * distinct from ArrowIcon's horizontal "proceed" chevron above. */
function ExternalArrowIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 8.5 8.5 3.5M4.3 3.5h4.2v4.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden="true">
      <path d="M5 1.2 1 5l4 3.8M1 5h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 19V10M10.5 19V5M16.5 19v-7M4.5 19h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h9.5M18.5 7H20M4 17h2M8.5 17H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2.1" fill="var(--ivory)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="17" r="2.1" fill="var(--ivory)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function categoryIcon(key: keyof CookieConsentChoices) {
  return key === 'analytics' ? <ChartIcon /> : <SlidersIcon />;
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
  // Only meaningful while still undecided -- that's the one case where
  // "back" has a compact Accept/Decline view to actually return to.
  // Once a choice already exists (reopened later from the footer),
  // there's nothing to go back to, so the control doesn't render.
  const canGoBack = expanded && choices === null;

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
              {canGoBack && (
                <button type="button" className="cookie-panel__back" onClick={closePreferences}>
                  <BackArrowIcon />
                  Back
                </button>
              )}
              <Logo variant="dark" className="cookie-panel__logo" />
              <h2 className="cookie-panel__heading">Cookie preferences</h2>
              <p className="cookie-panel__body">
                We use cookies to improve your experience on AIIT.NETWORK. You can choose which cookies you&apos;d
                like to allow and update your preferences at any time from the footer.
              </p>
              <CookieShieldMark />
              <Link to="/privacy-policy" className="cookie-panel__policy-link" onClick={closeAction}>
                Learn more about our Cookie Policy
                <ExternalArrowIcon />
              </Link>
            </div>

            <div className="cookie-panel__main">
              <ul className="cookie-panel__list">
                <li className="cookie-panel__row">
                  <span className="cookie-panel__row-icon" aria-hidden="true">
                    <GearIcon />
                  </span>
                  <div className="cookie-panel__row-text">
                    <span className="cookie-panel__row-title-line">
                      <span className="cookie-panel__row-title">Essential cookies</span>
                      <span className="cookie-panel__row-pill">Required</span>
                    </span>
                    <span className="cookie-panel__row-body">Required for the website to function properly.</span>
                  </div>
                  <div className="cookie-panel__row-control">
                    <Toggle label="Essential cookies" checked disabled />
                    <span className="cookie-panel__row-locked">Always active</span>
                  </div>
                </li>
                {CATEGORIES.map((c) => (
                  <li className="cookie-panel__row" key={c.key}>
                    <span className="cookie-panel__row-icon" aria-hidden="true">
                      {categoryIcon(c.key)}
                    </span>
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

              <div className="cookie-panel__actions cookie-panel__actions--end">
                <button type="button" className="cookie-panel__btn cookie-panel__btn--secondary" onClick={rejectNonEssential}>
                  Reject all
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
              <CookieShieldMark />
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
