import { DEFAULT_DAYS, endDateForWeeks, overlaps, planSessions } from './timetable-plan';

const slots = DEFAULT_DAYS.map((weekday) => ({ weekday, startTime: '18:00', durationMinutes: 120 }));

describe('planSessions', () => {
  it('builds Mon/Wed/Fri for four weeks as exact UTC instants (Lagos is UTC+1)', () => {
    // 2026-10-05 is a Monday.
    const sessions = planSessions('2026-10-05', endDateForWeeks('2026-10-05', 4), slots, 'Africa/Lagos');

    expect(sessions).toHaveLength(12);
    expect(sessions[0].startsAt.toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect(sessions[0].endsAt.toISOString()).toBe('2026-10-05T19:00:00.000Z');
    expect(sessions[1].startsAt.toISOString()).toBe('2026-10-07T17:00:00.000Z'); // Wednesday
    expect(sessions[2].startsAt.toISOString()).toBe('2026-10-09T17:00:00.000Z'); // Friday
    expect(sessions[11].startsAt.toISOString()).toBe('2026-10-30T17:00:00.000Z');
  });

  it('keeps the wall-clock time steady across a daylight-saving change', () => {
    // US clocks go back on Sunday 1 Nov 2026: 18:00 New York is 22:00Z before, 23:00Z after.
    const sessions = planSessions('2026-10-30', '2026-11-03', slots, 'America/New_York');
    expect(sessions.map((s) => s.startsAt.toISOString())).toEqual([
      '2026-10-30T22:00:00.000Z', // Fri, EDT
      '2026-11-02T23:00:00.000Z', // Mon, EST
    ]);
  });

  it('returns nothing when no slot matches the range', () => {
    expect(planSessions('2026-10-06', '2026-10-06', slots, 'UTC')).toEqual([]); // a Tuesday
  });

  it('sorts sessions chronologically even with several slots a day', () => {
    const two = [
      { weekday: 1, startTime: '18:00', durationMinutes: 60 },
      { weekday: 1, startTime: '09:00', durationMinutes: 60 },
    ];
    const s = planSessions('2026-10-05', '2026-10-05', two, 'UTC');
    expect(s.map((x) => x.startsAt.toISOString())).toEqual(['2026-10-05T09:00:00.000Z', '2026-10-05T18:00:00.000Z']);
  });
});

describe('endDateForWeeks / overlaps', () => {
  it('ends on the last day of the final week', () => {
    expect(endDateForWeeks('2026-10-05', 1)).toBe('2026-10-11');
    expect(endDateForWeeks('2026-10-05', 4)).toBe('2026-11-01');
  });

  it('treats back-to-back sessions as not overlapping', () => {
    const t = (h: number) => new Date(Date.UTC(2026, 9, 5, h));
    expect(overlaps(t(10), t(12), t(12), t(14))).toBe(false);
    expect(overlaps(t(10), t(12), t(11), t(13))).toBe(true);
  });
});
