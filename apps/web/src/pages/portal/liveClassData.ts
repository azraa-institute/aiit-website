import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveClassSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { useMe } from '@/lib/me';

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

function isValidZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone class times are shown in: the one the person chose in their
 * profile, else their device's own. Classes are stored as exact moments, so
 * a learner in Lagos and one in London each see the same class at their own
 * local time.
 */
export function useDisplayZone(): { zone: string; fromProfile: boolean } {
  const me = useMe();
  const profileZone = me.status === 'ready' ? me.me.timeZone : null;
  if (isValidZone(profileZone)) return { zone: profileZone, fromProfile: true };
  return { zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', fromProfile: false };
}

/** "Mon 5 Oct" in the given zone. */
export function formatClassDay(iso: string, zone?: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone });
}

/** "17:00" in the given zone. */
export function formatClassTime(iso: string, zone?: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: zone });
}

/** "17:00 – 19:00 GMT+1" -- names the zone so nobody is left guessing. */
export function formatClassRange(startsAt: string, endsAt: string, zone?: string): string {
  const name =
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'short', timeZone: zone })
      .formatToParts(new Date(startsAt))
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${formatClassTime(startsAt, zone)} – ${formatClassTime(endsAt, zone)} ${name}`.trim();
}

/** "2026-10-05" for an instant, as the calendar day in `zone`. */
export function dayKey(iso: string, zone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  );
}

/** The seven day keys (Mon..Sun) of the week containing `key`, offset by `weeks`. */
export function weekKeys(key: string, weeks = 0): string[] {
  const d = new Date(`${key}T00:00:00Z`);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  const monday = d.getTime() - mondayOffset * 86_400_000 + weeks * 7 * 86_400_000;
  return Array.from({ length: 7 }, (_, i) => new Date(monday + i * 86_400_000).toISOString().slice(0, 10));
}

/** Classes that overlap another of the caller's still-upcoming classes -> the titles they clash with. */
export function findClashes(classes: LiveClassSummary[]): Map<string, string[]> {
  const live = classes
    .filter((c) => c.status !== 'cancelled' && c.status !== 'ended')
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const clashes = new Map<string, string[]>();
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      if (new Date(live[j].startsAt) >= new Date(live[i].endsAt)) break;
      if (live[i].courseId === live[j].courseId) continue;
      clashes.set(live[i].id, [...(clashes.get(live[i].id) ?? []), live[j].courseTitle]);
      clashes.set(live[j].id, [...(clashes.get(live[j].id) ?? []), live[i].courseTitle]);
    }
  }
  return clashes;
}
