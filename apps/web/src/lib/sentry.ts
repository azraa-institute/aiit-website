import * as Sentry from '@sentry/react';

/** No-op without VITE_SENTRY_DSN set, same pattern as the API's Sentry.init. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  // Vite's own MODE is "production" for both a Preview and a Production
  // Vercel deploy -- it has no concept of Vercel's environments, so on its
  // own it can't tell preview traffic apart from real production traffic in
  // Sentry. VITE_VERCEL_ENV is set per-environment in Vercel (a "production"
  // value scoped to Production, "preview" scoped to Preview) specifically to
  // recover that distinction; falls back to MODE for local dev/build.
  const environment = import.meta.env.VITE_VERCEL_ENV ?? import.meta.env.MODE;
  Sentry.init({ dsn, environment });
}

/** Reports a real bug to Sentry when one is configured; a no-op otherwise. */
export function captureException(error: unknown): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error);
}
