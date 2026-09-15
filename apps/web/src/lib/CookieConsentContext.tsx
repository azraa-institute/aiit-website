import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * The two cookie categories a visitor can actually turn on/off, matching
 * the three categories disclosed in privacy.ts's "Cookies and tracking"
 * section 1:1 ("Essential cookies", "Analytics cookies", "Preference
 * cookies") -- essential is always on and isn't part of this type since
 * it's never a real choice.
 */
export interface CookieConsentChoices {
  analytics: boolean;
  preferences: boolean;
}

const DECLINE_ALL: CookieConsentChoices = { analytics: false, preferences: false };
const ACCEPT_ALL: CookieConsentChoices = { analytics: true, preferences: true };

const STORAGE_KEY = 'aiit.cookie-consent.v1';

interface StoredConsent extends CookieConsentChoices {
  decidedAt: string;
}

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== 'boolean' || typeof parsed?.preferences !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredConsent(choices: CookieConsentChoices) {
  try {
    const record: StoredConsent = { ...choices, decidedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable (private mode, blocked, etc.) -- consent still
       works for this tab via in-memory state, it just won't persist */
  }
}

/**
 * Read-only helper for non-React code that needs to gate a script behind
 * consent before it loads (e.g. an analytics snippet added later, or a
 * one-off check in index.html). Prefer useCookieConsent() inside React.
 */
export function hasCookieConsent(category: keyof CookieConsentChoices): boolean {
  return readStoredConsent()?.[category] === true;
}

interface CookieConsentContextValue {
  /** null = no decision yet (the banner should be showing). */
  choices: CookieConsentChoices | null;
  bannerOpen: boolean;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (choices: CookieConsentChoices) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  /** Closes the notice WITHOUT recording a decision (nothing is written to
   * storage) -- for a plain close/dismiss control on the not-yet-decided
   * notice. It reappears on the next full page load, same as if the
   * visitor had never seen it, since no choice was actually made. */
  dismissBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [choices, setChoices] = useState<CookieConsentChoices | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      setChoices({ analytics: stored.analytics, preferences: stored.preferences });
    } else {
      setBannerOpen(true);
    }
  }, []);

  const decide = useCallback((next: CookieConsentChoices) => {
    writeStoredConsent(next);
    setChoices(next);
    setBannerOpen(false);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      choices,
      bannerOpen,
      preferencesOpen,
      acceptAll: () => decide(ACCEPT_ALL),
      rejectNonEssential: () => decide(DECLINE_ALL),
      savePreferences: decide,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      dismissBanner: () => {
        setBannerOpen(false);
        setPreferencesOpen(false);
      },
    }),
    [choices, bannerOpen, preferencesOpen, decide],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent() must be used within a <CookieConsentProvider>.');
  return ctx;
}
