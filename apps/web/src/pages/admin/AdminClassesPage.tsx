import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminLiveClass } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  formatWhen,
  fromLocalInput,
  toLocalInput,
  useAdminClasses,
  useAdminCourses,
  useAdminInstructors,
  type ClassInput,
} from './adminData';

interface FormState {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  hostUserId: string;
  joinOpensMinutes: number;
}

interface AttendanceRow {
  userId: string;
  name: string | null;
  firstJoinedAt: string;
  lastLeftAt: string | null;
  totalSeconds: number;
}

function emptyForm(courseId = ''): FormState {
  return { courseId, title: '', description: '', startsAt: '', endsAt: '', hostUserId: '', joinOpensMinutes: 15 };
}

function fromClass(c: AdminLiveClass): FormState {
  return {
    id: c.id,
    courseId: c.courseId,
    title: c.title,
    description: c.description ?? '',
    startsAt: toLocalInput(c.startsAt),
    endsAt: toLocalInput(c.endsAt),
    hostUserId: c.hostUserId ?? '',
    joinOpensMinutes: 15,
  };
}

function minutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

export default function AdminClassesPage() {
  const courses = useAdminCourses();
  const instructors = useAdminInstructors();
  const [courseFilter, setCourseFilter] = useState('');
  const classes = useAdminClasses(courseFilter || undefined);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<{ id: string; rows: AttendanceRow[] } | null>(null);

  const courseList = courses.status === 'ready' ? courses.data : [];
  const instructorList = instructors.status === 'ready' ? instructors.data : [];

  function patch(update: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...update } : f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    const body: ClassInput = {
      title: form.title,
      description: form.description || undefined,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      hostUserId: form.hostUserId || null,
      joinOpensMinutes: form.joinOpensMinutes,
    };
    try {
      if (form.id) {
        await apiFetch(`/admin/live-classes/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setNotice('Class updated.');
      } else {
        await apiFetch('/admin/live-classes', { method: 'POST', body: JSON.stringify({ ...body, courseId: form.courseId }) });
        setNotice('Class scheduled.');
      }
      setForm(null);
      classes.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the class.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelClass(id: string) {
    setBusyId(id);
    setError(undefined);
    try {
      await apiFetch(`/admin/live-classes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
      setConfirmCancel(null);
      setNotice('Class cancelled. Enrolled learners will see it as cancelled.');
      classes.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the class.');
    } finally {
      setBusyId(null);
    }
  }

  async function showAttendance(id: string) {
    if (attendance?.id === id) {
      setAttendance(null);
      return;
    }
    setBusyId(id);
    setError(undefined);
    try {
      const rows = await apiFetch<AttendanceRow[]>(`/admin/live-classes/${id}/attendance`);
      setAttendance({ id, rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Scheduling</p>
          <h1 className="adm-title">Classes</h1>
          <p className="adm-intro">
            Every dated live class, whether it came from a timetable or was added by hand. Times below are shown in your
            browser&apos;s time zone. A class that has started can no longer be edited.
          </p>
        </div>
        {!form ? (
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={() => { setForm(emptyForm(courseFilter)); setNotice(undefined); setError(undefined); }}
          >
            Add a one-off class
          </button>
        ) : null}
      </div>

      {notice ? <p className="adm-notice" role="status">{notice}</p> : null}
      {error && !form ? <p className="adm-error" role="alert">{error}</p> : null}

      {form ? (
        <form className="adm-form" onSubmit={handleSubmit}>
          <h2 className="adm-form__title">{form.id ? 'Edit class' : 'New one-off class'}</h2>
          <div className="adm-grid">
            <label className="adm-field adm-field--wide">
              <span>Course</span>
              <select required disabled={Boolean(form.id)} value={form.courseId} onChange={(e) => patch({ courseId: e.target.value })}>
                <option value="">Select a course…</option>
                {courseList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field adm-field--wide">
              <span>Title</span>
              <input required minLength={2} maxLength={160} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Description (optional)</span>
              <textarea rows={2} maxLength={2000} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Starts</span>
              <input required type="datetime-local" value={form.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Ends</span>
              <input required type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={(e) => patch({ endsAt: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Instructor</span>
              <select value={form.hostUserId} onChange={(e) => patch({ hostUserId: e.target.value })}>
                <option value="">Not assigned yet</option>
                {instructorList.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name || i.email || i.id.slice(0, 8)}
                    {i.name && i.email ? ` (${i.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Classroom opens (minutes before)</span>
              <input type="number" min={0} max={120} value={form.joinOpensMinutes} onChange={(e) => patch({ joinOpensMinutes: Number(e.target.value) })} />
            </label>
          </div>
          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Schedule class'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="adm-filter">
        <label>
          <span>Course</span>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All courses</option>
            {courseList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {classes.status === 'loading' ? <p className="adm-muted">Loading classes…</p> : null}
      {classes.status === 'error' ? <p className="adm-error" role="alert">{classes.message}</p> : null}
      {classes.status === 'ready' && classes.data.length === 0 ? (
        <p className="adm-muted">No classes yet. Generate them from a timetable, or add a one-off class.</p>
      ) : null}

      {classes.status === 'ready' && classes.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {classes.data.map((c) => {
            const editable = c.status === 'scheduled';
            return (
              <li className="adm-card" key={c.id}>
                <div className="adm-card__main">
                  <h3>
                    {c.title} <span className={cn('adm-status', `adm-status--${c.status}`)}>{c.status}</span>
                  </h3>
                  <p className="adm-card__meta">{c.courseTitle}</p>
                  <p className="adm-card__meta">
                    {formatWhen(c.startsAt)} → {formatWhen(c.endsAt)} ·{' '}
                    {c.hostName ? `Instructor: ${c.hostName}` : c.hostUserId ? 'Instructor assigned' : 'No instructor yet'} ·{' '}
                    {c.attendeeCount} attended
                  </p>
                  {attendance?.id === c.id ? (
                    <div className="adm-attendance">
                      {attendance.rows.length === 0 ? (
                        <p className="adm-muted">No learners have joined this class.</p>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Learner</th>
                              <th>First joined</th>
                              <th>Time in class</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.rows.map((r) => (
                              <tr key={r.userId}>
                                <td>{r.name ?? r.userId.slice(0, 8)}</td>
                                <td>{formatWhen(r.firstJoinedAt)}</td>
                                <td>{minutes(r.totalSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="adm-card__actions">
                  {confirmCancel === c.id ? (
                    <>
                      <span className="adm-muted">Cancel this class?</span>
                      <button type="button" className="adm-btn adm-btn--danger" disabled={busyId === c.id} onClick={() => cancelClass(c.id)}>
                        Cancel class
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmCancel(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      {editable ? (
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setForm(fromClass(c)); setNotice(undefined); setError(undefined); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                          Edit
                        </button>
                      ) : null}
                      {editable ? (
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmCancel(c.id)}>
                          Cancel
                        </button>
                      ) : null}
                      <button type="button" className="adm-btn adm-btn--ghost" disabled={busyId === c.id} onClick={() => showAttendance(c.id)}>
                        {attendance?.id === c.id ? 'Hide attendance' : 'Attendance'}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
