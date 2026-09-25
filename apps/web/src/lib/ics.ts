import type { LiveClassSummary } from '@aiit/shared';

/** RFC 5545 text escaping. */
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 20261005T170000Z */
function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Lines longer than 75 octets must be folded (continuation lines start with a space). */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push(line.slice(i, i + 73));
  return parts.join('\r\n ');
}

/**
 * An iCalendar file for a learner's upcoming classes, so the whole timetable
 * can be added to Google / Apple / Outlook in one step. Times are UTC instants,
 * so the calendar app shows them in the person's own zone.
 */
export function buildClassCalendar(classes: LiveClassSummary[], origin: string): string {
  const now = stamp(new Date().toISOString());
  const events = classes
    .filter((c) => c.status !== 'cancelled' && c.status !== 'ended' && new Date(c.endsAt).getTime() > Date.now())
    .flatMap((c) => [
      'BEGIN:VEVENT',
      `UID:${c.id}@aiit.network`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(c.startsAt)}`,
      `DTEND:${stamp(c.endsAt)}`,
      `SUMMARY:${esc(`${c.title} (AIIT live class)`)}`,
      `DESCRIPTION:${esc(`${c.courseTitle}${c.hostName ? ` with ${c.hostName}` : ''}. Join from your AIIT timetable when the class is live.`)}`,
      `URL:${origin}/classroom/${c.id}`,
      'END:VEVENT',
    ]);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIIT//Live classes//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:AIIT live classes',
    ...events,
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n');
}
