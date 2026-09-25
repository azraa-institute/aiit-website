import { useState } from 'react';
import type { AttendanceReportRow } from '@aiit/shared';
import { apiFetchBlob, downloadBlob } from '@/lib/api';
import { formatWhen, useAdminCourses, useAdminFetch } from './adminData';

function rate(row: AttendanceReportRow): string {
  return row.enrolled > 0 ? `${Math.round((row.attended / row.enrolled) * 100)}%` : '—';
}

export default function AdminReportsPage() {
  const courses = useAdminCourses();
  const [courseId, setCourseId] = useState('');
  const report = useAdminFetch<AttendanceReportRow[]>(courseId ? `/admin/reports/attendance?courseId=${courseId}` : '/admin/reports/attendance');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const courseList = courses.status === 'ready' ? courses.data : [];

  async function download(path: string, filename: string) {
    setBusy(filename);
    setError(undefined);
    try {
      downloadBlob(await apiFetchBlob(path), filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download that file.');
    } finally {
      setBusy(null);
    }
  }

  const rows = report.status === 'ready' ? report.data : [];
  const held = rows.filter((r) => r.status === 'ended' || r.status === 'live');
  const overall =
    held.length > 0 && held.some((r) => r.enrolled > 0)
      ? Math.round((held.reduce((s, r) => s + r.attended, 0) / Math.max(1, held.reduce((s, r) => s + r.enrolled, 0))) * 100)
      : null;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Reports</p>
          <h1 className="adm-title">Attendance &amp; exports</h1>
          <p className="adm-intro">
            How many enrolled students actually joined each live class, and spreadsheet exports of your data.
          </p>
        </div>
      </div>

      <section className="adm-panel" aria-labelledby="exports">
        <div className="adm-panel__head">
          <h2 id="exports">Download (CSV)</h2>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--ghost" disabled={busy !== null} onClick={() => download('/admin/exports/students', 'aiit-students.csv')}>
            {busy === 'aiit-students.csv' ? 'Preparing…' : 'All students'}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={busy !== null} onClick={() => download('/admin/exports/enrollments', 'aiit-enrollments.csv')}>
            {busy === 'aiit-enrollments.csv' ? 'Preparing…' : 'Enrolments by course'}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            disabled={busy !== null}
            onClick={() => download(courseId ? `/admin/exports/attendance?courseId=${courseId}` : '/admin/exports/attendance', 'aiit-attendance.csv')}
          >
            {busy === 'aiit-attendance.csv' ? 'Preparing…' : `Attendance${courseId ? ' (this course)' : ''}`}
          </button>
        </div>
        {error ? <p className="adm-error" role="alert">{error}</p> : null}
      </section>

      <div className="adm-toolbar adm-toolbar--gap">
        <label className="adm-field">
          <span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">All courses</option>
            {courseList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        {overall !== null ? (
          <p className="adm-muted">
            Overall attendance for these classes: <strong>{overall}%</strong>
          </p>
        ) : null}
      </div>

      {report.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {report.status === 'error' ? <p className="adm-error" role="alert">{report.message}</p> : null}
      {report.status === 'ready' && rows.length === 0 ? <p className="adm-muted">No classes have been held yet.</p> : null}
      {rows.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table adm-table--rows">
            <thead>
              <tr>
                <th>Class</th>
                <th>Course</th>
                <th>When</th>
                <th>Instructor</th>
                <th className="num">Joined</th>
                <th className="num">Enrolled</th>
                <th className="num">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.classId}>
                  <td>{r.title}</td>
                  <td>{r.courseTitle}</td>
                  <td>{formatWhen(r.startsAt)}</td>
                  <td>{r.hostName ?? '—'}</td>
                  <td className="num">{r.attended}</td>
                  <td className="num">{r.enrolled}</td>
                  <td className="num">{r.status === 'cancelled' ? 'cancelled' : rate(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
