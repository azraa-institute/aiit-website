/**
 * Remembers which portal section a signed-in learner left from, so the
 * public site's header can offer a specific way back in ("Return to
 * Resources") instead of just a generic dashboard link -- set only when
 * leaving via the portal's own Resources links (PortalResourcesPage.tsx),
 * cleared the moment they're back inside the portal shell (PortalLayout.tsx).
 * Sessionstorage, not React state, since it has to survive full page
 * navigations to the public /courses and /resources routes.
 */
const KEY = 'aiit:portal-return';

export type PortalReturnTarget = 'resources';

export function markPortalExit(target: PortalReturnTarget) {
  try {
    sessionStorage.setItem(KEY, target);
  } catch {
    // Storage can throw in locked-down contexts (private mode, disabled
    // storage) -- the header just falls back to the generic "Return to
    // Dashboard" label, so this is safe to ignore.
  }
}

export function getPortalReturn(): PortalReturnTarget | null {
  try {
    return sessionStorage.getItem(KEY) === 'resources' ? 'resources' : null;
  } catch {
    return null;
  }
}

export function clearPortalReturn() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
