import { computeJoinState, JOIN_GRACE_MINUTES } from './live-class-state';
import { isValidTimeZone, zonedTimeToUtc } from './tz.util';

const START = new Date('2026-10-05T17:00:00Z');
const END = new Date('2026-10-05T18:00:00Z');
const base = { startsAt: START, endsAt: END, joinOpensMinutes: 15 };

describe('computeJoinState', () => {
  const at = (iso: string) => new Date(iso);

  it('is not_open before the join window', () => {
    expect(computeJoinState({ ...base, status: 'scheduled' }, 'learner', at('2026-10-05T16:44:00Z'))).toBe('not_open');
    expect(computeJoinState({ ...base, status: 'scheduled' }, 'host', at('2026-10-05T16:44:00Z'))).toBe('not_open');
  });

  it('makes learners wait for the instructor to start, but lets the host in', () => {
    const now = at('2026-10-05T16:50:00Z');
    expect(computeJoinState({ ...base, status: 'scheduled' }, 'learner', now)).toBe('waiting_for_host');
    expect(computeJoinState({ ...base, status: 'scheduled' }, 'host', now)).toBe('open');
  });

  it('opens for learners once the class is live', () => {
    expect(computeJoinState({ ...base, status: 'live' }, 'learner', at('2026-10-05T17:10:00Z'))).toBe('open');
  });

  it('allows a grace period after the scheduled end, then closes', () => {
    const live = { ...base, status: 'live' as const };
    const justInside = new Date(END.getTime() + (JOIN_GRACE_MINUTES - 1) * 60_000);
    const justOutside = new Date(END.getTime() + (JOIN_GRACE_MINUTES + 1) * 60_000);
    expect(computeJoinState(live, 'learner', justInside)).toBe('open');
    expect(computeJoinState(live, 'learner', justOutside)).toBe('ended');
  });

  it('respects terminal statuses regardless of time', () => {
    const now = at('2026-10-05T17:10:00Z');
    expect(computeJoinState({ ...base, status: 'cancelled' }, 'host', now)).toBe('cancelled');
    expect(computeJoinState({ ...base, status: 'ended' }, 'host', now)).toBe('ended');
  });
});

describe('zonedTimeToUtc', () => {
  it('converts Lagos (UTC+1, no DST) wall time to UTC', () => {
    expect(zonedTimeToUtc(2026, 10, 5, 18, 0, 'Africa/Lagos').toISOString()).toBe('2026-10-05T17:00:00.000Z');
  });

  it('follows daylight saving in the given zone', () => {
    // New York is UTC-4 in October (EDT) and UTC-5 in December (EST).
    expect(zonedTimeToUtc(2026, 10, 5, 18, 0, 'America/New_York').toISOString()).toBe('2026-10-05T22:00:00.000Z');
    expect(zonedTimeToUtc(2026, 12, 7, 18, 0, 'America/New_York').toISOString()).toBe('2026-12-07T23:00:00.000Z');
  });

  it('validates IANA zone names', () => {
    expect(isValidTimeZone('Africa/Lagos')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
