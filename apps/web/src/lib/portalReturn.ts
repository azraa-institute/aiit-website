/**
 * Remembers which portal section a signed-in learner left from, so the
 * public site's header can offer a specific way back in ("Return to
 * Resources", "Return to my courses") instead of just a generic dashboard
 * link -- set only when leaving via the portal's own links out to a public
 * page (PortalResourcesPage.tsx's Resources links, MyCoursesPage.tsx's "Add
 * a course" link), cleared the moment they're back inside the portal shell
 * (PortalLayout.tsx). Sessionstorage, not React state, since it has to
 * survive full page navigations to the public /courses and /resources
 * routes.
 */
const KEY = 'aiit:portal-return';

export type PortalReturnTarget = 'resources' | 'courses';

const TARGETS: PortalReturnTarget[] = ['resources', 'courses'];

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
    const stored = sessionStorage.getItem(KEY);
    return TARGETS.find((t) => t === stored) ?? null;
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
