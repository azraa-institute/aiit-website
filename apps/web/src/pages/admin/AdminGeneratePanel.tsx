import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { GenerateTimetableResponse, TimetableConflict } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { WEEKDAYS, allTimeZones, browserTimeZone, formatWhen, useAdminCourseList } from './adminData';

/** The next Monday after today, as YYYY-MM-DD -- a sensible default start for a fresh month. */
function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DURATIONS = [60, 90, 120, 150, 180];

/**
 * The one-click timetable: pick a course, a time zone and a start date, then
 * Generate. Everything else has a default (Mon/Wed/Fri, 18:00, 2 hours, four
 * weeks = the one-month course) and can be changed under "Adjust the pattern".
 * The instructor is the one assigned to the course. Classes are stored as
 * exact moments, so every student sees them in the time zone from their own
 * profile -- the zone chosen here is only the one the 18:00 is written in.
 */
export function AdminGeneratePanel({ onDone }: { onDone: () => void }) {
  const courses = useAdminCourseList();
  const zones = useMemo(allTimeZones, []);
  const [courseId, setCourseId] = useState('');
  const [timeZone, setTimeZone] = useState(browserTimeZone());
  const [startDate, setStartDate] = useState(nextMonday());
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [startTime, setStartTime] = useState('18:00');
  const [duration, setDuration] = useState(120);
  const [weeks, setWeeks] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Extract<GenerateTimetableResponse, { status: 'created' }> | null>(null);
  const [conflicts, setConflicts] = useState<{ instructorName: string | null; list: TimetableConflict[] } | null>(null);

  const courseList = courses.status === 'ready' ? courses.data : [];
  const chosen = courseList.find((c) => c.id === courseId);
  const perWeek = days.length;
  const summary = `${perWeek * weeks} classes · ${[...days].sort().map((d) => WEEKDAYS[d].slice(0, 3)).join(', ')} at ${startTime} · ${duration / 60} h each · ${weeks} weeks`;

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  async function generate(allowConflicts: boolean) {
    setBusy(true);
    setError(undefined);
    setResult(null);
    if (!allowConflicts) setConflicts(null);
    try {
      const res = await apiFetch<GenerateTimetableResponse>('/admin/timetables/auto-generate', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          timeZone,
          startDate,
          days,
          startTime,
          durationMinutes: duration,
          weeks,
          allowConflicts: allowConflicts || undefined,
        }),
      });
      if (res.status === 'conflicts') {
        setConflicts({ instructorName: res.instructorName, list: res.conflicts });
      } else {
        setConflicts(null);
        setResult(res);
        onDone();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the timetable.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void generate(false);
  }

  return (
    <section className="adm-panel adm-gen" aria-labelledby="gen-title">
      <h2 id="gen-title">Generate a timetable</h2>
      <p className="adm-muted">
        Pick a course, a time zone and a start date. The month&apos;s classes are created for the course&apos;s instructor,
        and every enrolled student sees them in their own time zone.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="adm-grid adm-gen__grid">
          <label className="adm-field adm-field--wide">
            <span>Course</span>
            <select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select a course…</option>
              {courseList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {c.enrolled} student{c.enrolled === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Time zone the class time is set in</span>
            <input required list="gen-zones" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
            <datalist id="gen-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          <label className="adm-field">
            <span>First day</span>
            <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>

        {chosen ? (
          <p className="adm-gen__instructor">
            {chosen.instructors.length === 0 ? (
              <>
                <strong>No instructor is assigned to this course yet.</strong> Classes can still be generated, but no one will
                host them until you <Link to="/admin/courses">assign an instructor</Link>.
              </>
            ) : (
              <>
                Instructor: <strong>{chosen.instructors.map((i) => i.name ?? 'Unnamed').join(', ')}</strong>
              </>
            )}
          </p>
        ) : null}

        <details className="adm-details">
          <summary>Adjust the pattern (optional)</summary>
          <div className="adm-gen__advanced">
            <fieldset className="adm-days">
              <legend>Days</legend>
              {WEEKDAYS.map((name, d) => (
                <label key={name} className={cn('adm-day', days.includes(d) && 'is-on')}>
                  <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} />
                  <span>{name.slice(0, 3)}</span>
                </label>
              ))}
            </fieldset>
            <label className="adm-field">
              <span>Start time</span>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Length</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {m / 60} hour{m === 60 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Weeks</span>
              <input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
            </label>
          </div>
        </details>

        <p className="adm-gen__summary">{summary}</p>

        {error ? <p className="adm-error" role="alert">{error}</p> : null}

        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !courseId || days.length === 0}>
            {busy ? 'Generating…' : 'Generate timetable'}
          </button>
        </div>
      </form>

      {result ? (
        <p className="adm-notice" role="status">
          Scheduled <strong>{result.created} classes</strong> for {result.timetable.courseTitle}
          {result.instructorName ? ` with ${result.instructorName}` : ''}. Students see them in their timetable now.
          {result.unassigned ? ' No instructor is assigned yet — assign one under Courses and they will be added as host.' : ''}
        </p>
      ) : null}

      {conflicts ? (
        <div className="adm-conflicts" role="alert">
          <p>
            <strong>{conflicts.instructorName ?? 'The instructor'}</strong> is already teaching at {conflicts.list.length} of these
            times, so nothing was created:
          </p>
          <ul className="adm-plain">
            {conflicts.list.slice(0, 8).map((c) => (
              <li key={c.startsAt}>
                {formatWhen(c.startsAt)} — already teaching “{c.otherClass}”
              </li>
            ))}
            {conflicts.list.length > 8 ? <li>…and {conflicts.list.length - 8} more</li> : null}
          </ul>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConflicts(null)}>
              Change the pattern
            </button>
            <button type="button" className="adm-btn adm-btn--danger" disabled={busy} onClick={() => generate(true)}>
              Generate anyway
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
