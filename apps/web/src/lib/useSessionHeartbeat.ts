import { useEffect } from 'react';
import { apiFetch } from './api';

/**
 * Periodically confirms the signed-in account is still active, so a
 * suspension (or deletion) takes effect within a bounded time even on a page
 * that makes no other API calls of its own -- without this, a student who
 * lands on a quiet page (e.g. Profile) right when an admin suspends them
 * could stay signed in until they next navigate somewhere that fetches data.
 * apiFetch's own error handling already signs the browser out and redirects
 * once the account comes back suspended or deleted; this hook's only job is
 * to keep that check firing regardless of which page is open.
 */
export function useSessionHeartbeat(intervalMs = 20_000): void {
  useEffect(() => {
    const timer = window.setInterval(() => {
      apiFetch('/auth/me').catch(() => {});
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
}
