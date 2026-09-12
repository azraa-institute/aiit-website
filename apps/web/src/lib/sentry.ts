import * as Sentry from '@sentry/react';

/** No-op without VITE_SENTRY_DSN set, same pattern as the API's Sentry.init. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({ dsn, environment: import.meta.env.MODE });
}

/** Reports a real bug to Sentry when one is configured; a no-op otherwise. */
export function captureException(error: unknown): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error);
}
