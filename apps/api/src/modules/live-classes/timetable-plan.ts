import { zonedTimeToUtc } from './tz.util';

export interface PlanSlot {
  weekday: number; // 0 = Sunday ... 6 = Saturday
  startTime: string; // "HH:MM", in the timetable's time zone
  durationMinutes: number;
}

export interface PlannedSession {
  startsAt: Date;
  endsAt: Date;
  slot: PlanSlot;
}

const DAY_MS = 86_400_000;

/**
 * Every session a weekly pattern produces between two calendar dates
 * (inclusive), as exact UTC instants. Pure: the same inputs always give the
 * same sessions, which is what makes generation idempotent and testable.
 * Dates are calendar days ("YYYY-MM-DD") in `timeZone`; a session's wall-clock
 * time is converted with DST taken into account.
 */
export function planSessions(
  startsOn: string,
  endsOn: string,
  slots: PlanSlot[],
  timeZone: string,
): PlannedSession[] {
  const start = new Date(`${startsOn}T00:00:00Z`).getTime();
  const end = new Date(`${endsOn}T00:00:00Z`).getTime();
  const sessions: PlannedSession[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    const day = new Date(t);
    const weekday = day.getUTCDay();
    for (const slot of slots.filter((s) => s.weekday === weekday)) {
      const [hh, mm] = slot.startTime.split(':').map(Number);
      const startsAt = zonedTimeToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hh, mm, timeZone);
      sessions.push({ startsAt, endsAt: new Date(startsAt.getTime() + slot.durationMinutes * 60_000), slot });
    }
  }
  return sessions.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** The last calendar day of a timetable that runs `weeks` full weeks from `startsOn`. */
export function endDateForWeeks(startsOn: string, weeks: number): string {
  const end = new Date(new Date(`${startsOn}T00:00:00Z`).getTime() + (weeks * 7 - 1) * DAY_MS);
  return end.toISOString().slice(0, 10);
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Defaults the admin gets from a one-click "Generate": 3 sessions a week (Mon/Wed/Fri), 2 hours, 4 weeks. */
export const DEFAULT_DAYS = [1, 3, 5];
export const DEFAULT_START_TIME = '18:00';
export const DEFAULT_DURATION_MINUTES = 120;
export const DEFAULT_WEEKS = 4;
