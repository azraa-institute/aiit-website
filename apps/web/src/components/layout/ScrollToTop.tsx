import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset scroll on in-app navigation (clicking a link to a different page),
 * but honour in-page #hash links, and leave a fresh page load/refresh
 * alone. The browser's own native scroll restoration already does the
 * right thing on refresh (confirmed live: reloading mid-scroll lands back
 * at the same position); calling scrollTo(0,0) unconditionally on mount
 * only risks fighting that -- a brief jump-to-top-then-back flash on a
 * slow connection -- for no benefit, since there's nothing to "reset" on
 * a first load. A #hash still scrolls to its target even on first load
 * (e.g. a direct link to /about#team), since that's a genuine deep link,
 * not scroll restoration.
 *
 * `key` (React Router's own unique id for this history entry) is the real
 * trigger, not `pathname`/`hash` by value -- a page with several links to
 * the exact same `#hash` (e.g. WebinarPage.tsx's four separate "Register"
 * CTAs, all `/webinar#register`) would otherwise look "stale" on every
 * click after the first: clicking a second one re-pushes the identical
 * pathname+hash, so `pathname`/`hash` never change in value and this
 * effect would never re-run, found live when a second Register click
 * silently did nothing. `key` changes on every `history.push`, including
 * a push to an identical URL, so the scroll always re-fires.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const didMountRef = useRef(false);

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash, key]);

  return null;
}
