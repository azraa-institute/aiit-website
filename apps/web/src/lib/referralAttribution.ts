/**
 * Tracks a pending affiliate referral between a /r/:slug link click and the
 * visitor's eventual signup (see ReferralRedirect in App.tsx and the
 * referral_slug metadata RegisterPage.tsx passes into signUp()). Same
 * try/catch-wrapped localStorage convention as CookieConsentContext.tsx --
 * private mode / blocked storage just means attribution silently doesn't
 * happen, never a broken signup.
 */

const STORAGE_KEY = 'aiit.referral.v1';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, last-click-wins

interface StoredReferral {
  slug: string;
  capturedAt: number;
}

export function setPendingReferralSlug(slug: string): void {
  try {
    const record: StoredReferral = { slug, capturedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable -- this visitor's referral just won't be attributed */
  }
}

export function getPendingReferralSlug(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReferral>;
    if (typeof parsed.slug !== 'string' || typeof parsed.capturedAt !== 'number') return null;
    if (Date.now() - parsed.capturedAt > ATTRIBUTION_WINDOW_MS) return null;
    return parsed.slug;
  } catch {
    return null;
  }
}

export function clearPendingReferralSlug(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clean up if storage isn't available in the first place */
  }
}
