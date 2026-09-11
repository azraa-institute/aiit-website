/**
 * Minimal client-only session flag for the learner-portal preview.
 *
 * There is no AIIT auth backend wired up here, so this just records that the
 * visitor went through the sign-in screen, which keeps the login -> portal ->
 * sign-out flow coherent. No credentials are stored or transmitted.
 */
const KEY = 'aiit.portal.preview';

export function startPortalSession(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function endPortalSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function hasPortalSession(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
