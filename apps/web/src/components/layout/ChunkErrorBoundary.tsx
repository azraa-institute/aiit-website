import { Component } from 'react';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { captureException } from '@/lib/sentry';
import './chunk-error-boundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export const CHUNK_RELOAD_FLAG = 'aiit-chunk-reload-attempted';
const RELOAD_FLAG = CHUNK_RELOAD_FLAG;

/** True for a failed dynamic import() -- the case a stale tab hits when a
 * deploy has replaced the hashed JS files it's still referencing. Message
 * wording differs by browser (Vite/Rollup's own wrapper text, Chrome's
 * "Failed to fetch dynamically imported module", Firefox/Safari's "error
 * loading dynamically imported module"), so this matches loosely on the
 * shared "dynamically imported module" phrase rather than one exact string. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed/i.test(message);
}

/**
 * Catches errors React's own Suspense boundary can't: a *rejected* lazy
 * import throws on render, not just stays pending. Without this, that
 * unmounts the whole tree -- a blank #root, exactly what a tab left open
 * across a deploy sees on its next in-app navigation, since the JS chunk it
 * was about to load no longer exists at that hashed filename.
 *
 * A chunk-load error gets one automatic reload (sessionStorage guards
 * against a loop if reloading doesn't actually fix it -- e.g. genuinely
 * offline). Any other error shows a manual "Reload page" fallback instead
 * of auto-reloading blind, so a real bug doesn't get silently masked by a
 * refresh loop.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      }
      return;
    }
    // A genuine bug, not the expected stale-deploy case -- worth knowing about.
    captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chunk-error" role="alert">
          <Logo variant="dark" />
          <p className="chunk-error__title">This page needs a refresh</p>
          <p className="chunk-error__body">
            A newer version of the site is available. Reload to pick it up.
          </p>
          <button type="button" className="chunk-error__button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
