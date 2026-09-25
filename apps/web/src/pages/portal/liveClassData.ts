import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveClassSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';

export type LiveClassesState =
  | { status: 'loading' }
  | { status: 'ready'; classes: LiveClassSummary[]; refetch: () => void }
  | { status: 'error'; message: string; refetch: () => void };

/**
 * The caller's own timetable (GET /me/live-classes: a learner's enrolled
 * courses, an instructor's hosted classes). Optionally re-polls so a class
 * flips from "waiting for instructor" to joinable without a manual refresh.
 * A failed poll keeps showing the last good data rather than blanking the page.
 */
export function useLiveClasses(pollMs = 0): LiveClassesState {
  const [state, setState] = useState<LiveClassesState>({ status: 'loading' });
  const lastGood = useRef<LiveClassSummary[] | null>(null);

  const load = useCallback(() => {
    apiFetch<LiveClassSummary[]>('/me/live-classes')
      .then((classes) => {
        lastGood.current = classes;
        setState({ status: 'ready', classes, refetch: load });
      })
      .catch((err: unknown) => {
        if (lastGood.current) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load your timetable.',
          refetch: load,
        });
      });
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const timer = window.setInterval(load, pollMs);
    return () => window.clearInterval(timer);
  }, [load, pollMs]);

  return state;
}

/** "Mon 5 Oct" style day heading in the viewer's own time zone. */
export function formatClassDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "17:00" in the viewer's own time zone. */
export function formatClassTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** "17:00 – 18:00 GMT+1" -- names the zone so a learner abroad is never left guessing. */
export function formatClassRange(startsAt: string, endsAt: string): string {
  const zone =
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(new Date(startsAt))
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${formatClassTime(startsAt)} – ${formatClassTime(endsAt)} ${zone}`.trim();
}
