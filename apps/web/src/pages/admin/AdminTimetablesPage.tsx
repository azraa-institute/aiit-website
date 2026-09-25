import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Timetable } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import {
  WEEKDAYS,
  allTimeZones,
  browserTimeZone,
  describeSlots,
  useAdminCourses,
  useAdminInstructors,
  useAdminTimetables,
  type TimetableInput,
} from './adminData';

interface SlotForm {
  weekday: number;
  startTime: string;
  durationMinutes: number;
}

interface FormState {
  id?: string;
  courseId: string;
  title: string;
  timeZone: string;
  startsOn: string;
  endsOn: string;
  hostUserId: string;
  slots: SlotForm[];
  generateNow: boolean;
}

const DURATIONS = [30, 45, 60, 90, 120, 180];

function emptyForm(): FormState {
  return {
    courseId: '',
    title: '',
    timeZone: browserTimeZone(),
    startsOn: '',
    endsOn: '',
    hostUserId: '',
    slots: [{ weekday: 1, startTime: '18:00', durationMinutes: 60 }],
    generateNow: true,
  };
}

function fromTimetable(t: Timetable): FormState {
  return {
    id: t.id,
    courseId: t.courseId,
    title: t.title,
    timeZone: t.timeZone,
    startsOn: t.startsOn,
    endsOn: t.endsOn,
    hostUserId: t.hostUserId ?? '',
    slots: t.slots.map((s) => ({ weekday: s.weekday, startTime: s.startTime, durationMinutes: s.durationMinutes })),
    generateNow: false,
  };
}

export default function AdminTimetablesPage() {
  const courses = useAdminCourses();
  const instructors = useAdminInstructors();
  const timetables = useAdminTimetables();
  const zones = useMemo(allTimeZones, []);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(update: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...update } : f));
  }

  function patchSlot(index: number, update: Partial<SlotForm>) {
    setForm((f) => (f ? { ...f, slots: f.slots.map((s, i) => (i === index ? { ...s, ...update } : s)) } : f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    const body: TimetableInput = {
      title: form.title,
      timeZone: form.timeZone,
      startsOn: form.startsOn,
      endsOn: form.endsOn,
      hostUserId: form.hostUserId || null,
      slots: form.slots,
    };
    try {
      if (form.id) {
        await apiFetch(`/admin/timetables/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setNotice('Timetable saved. Regenerate to add classes for any new days or times.');
      } else {
        const created = await apiFetch<Timetable>('/admin/timetables', {
          method: 'POST',
          body: JSON.stringify({ ...body, courseId: form.courseId }),
        });
        if (form.generateNow) {
          const r = await apiFetch<{ created: number }>(`/admin/timetables/${created.id}/generate`, { method: 'POST' });
          setNotice(`Timetable created and ${r.created} classes scheduled.`);
        } else {
          setNotice('Timetable created. Use "Generate classes" to schedule the dated classes.');
        }
      }
      setForm(null);
      timetables.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the timetable.');
    } finally {
      setSaving(false);
    }
  }

  async function generate(id: string) {
    setBusyId(id);
    setError(undefined);
    setNotice(undefined);
    try {
      const r = await apiFetch<{ created: number; skipped: number }>(`/admin/timetables/${id}/generate`, {
        method: 'POST',
      });
      setNotice(
        r.created === 0
          ? 'Nothing new to schedule — every upcoming class already exists.'
          : `Scheduled ${r.created} new class${r.created === 1 ? '' : 'es'}${r.skipped ? ` (${r.skipped} already existed)` : ''}.`,
      );
      timetables.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate classes.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(undefined);
    try {
      await apiFetch(`/admin/timetables/${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      setNotice('Timetable deleted.');
      timetables.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the timetable.');
    } finally {
      setBusyId(null);
    }
  }

  const courseList = courses.status === 'ready' ? courses.data : [];
  const instructorList = instructors.status === 'ready' ? instructors.data : [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Scheduling</p>
          <h1 className="adm-title">Timetables</h1>
          <p className="adm-intro">
            A timetable is a weekly pattern for one course. Generating it creates the dated live classes that learners
            see, each of which you can still edit or cancel on the Classes page.
          </p>
        </div>
        {!form ? (
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setForm(emptyForm()); setNotice(undefined); setError(undefined); }}>
            New timetable
          </button>
        ) : null}
      </div>

      {notice ? <p className="adm-notice" role="status">{notice}</p> : null}
      {error && !form ? <p className="adm-error" role="alert">{error}</p> : null}

      {form ? (
        <form className="adm-form" onSubmit={handleSubmit}>
          <h2 className="adm-form__title">{form.id ? 'Edit timetable' : 'New timetable'}</h2>

          <div className="adm-grid">
            <label className="adm-field adm-field--wide">
              <span>Course</span>
              <select
                required
                disabled={Boolean(form.id)}
                value={form.courseId}
                onChange={(e) => {
                  const course = courseList.find((c) => c.id === e.target.value);
                  patch({ courseId: e.target.value, title: form.title || (course ? `${course.title} — live class` : '') });
                }}
              >
                <option value="">Select a course…</option>
                {courseList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field adm-field--wide">
              <span>Class title</span>
              <input required minLength={2} maxLength={120} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>First day</span>
              <input required type="date" value={form.startsOn} onChange={(e) => patch({ startsOn: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Last day</span>
              <input required type="date" min={form.startsOn} value={form.endsOn} onChange={(e) => patch({ endsOn: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Time zone (slot times are in this zone)</span>
              <input required list="adm-zones" value={form.timeZone} onChange={(e) => patch({ timeZone: e.target.value })} />
              <datalist id="adm-zones">
                {zones.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </label>
            <label className="adm-field">
              <span>Instructor</span>
              <select value={form.hostUserId} onChange={(e) => patch({ hostUserId: e.target.value })}>
                <option value="">Not assigned yet</option>
                {instructorList
                  .filter((i) => i.status === 'active')
                  .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name || i.email || i.id.slice(0, 8)}
                    {i.name && i.email ? ` (${i.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="adm-slots">
            <legend>Weekly slots</legend>
            {form.slots.map((slot, i) => (
              <div className="adm-slot" key={i}>
                <select aria-label="Day" value={slot.weekday} onChange={(e) => patchSlot(i, { weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
                <input aria-label="Start time" required type="time" value={slot.startTime} onChange={(e) => patchSlot(i, { startTime: e.target.value })} />
                <select aria-label="Length" value={slot.durationMinutes} onChange={(e) => patchSlot(i, { durationMinutes: Number(e.target.value) })}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={form.slots.length === 1} onClick={() => patch({ slots: form.slots.filter((_, n) => n !== i) })}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={form.slots.length >= 21}
              onClick={() => patch({ slots: [...form.slots, { weekday: 3, startTime: '18:00', durationMinutes: 60 }] })}
            >
              + Add a slot
            </button>
          </fieldset>

          {!form.id ? (
            <label className="adm-check">
              <input type="checkbox" checked={form.generateNow} onChange={(e) => patch({ generateNow: e.target.checked })} />
              <span>Schedule the dated classes right away</span>
            </label>
          ) : null}

          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create timetable'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {timetables.status === 'loading' ? <p className="adm-muted">Loading timetables…</p> : null}
      {timetables.status === 'error' ? <p className="adm-error" role="alert">{timetables.message}</p> : null}
      {timetables.status === 'ready' && timetables.data.length === 0 && !form ? (
        <p className="adm-muted">No timetables yet. Create one to start scheduling live classes.</p>
      ) : null}

      {timetables.status === 'ready' && timetables.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {timetables.data.map((t) => {
            const host = instructorList.find((i) => i.id === t.hostUserId);
            return (
              <li className="adm-card" key={t.id}>
                <div className="adm-card__main">
                  <h3>{t.title}</h3>
                  <p className="adm-card__meta">{t.courseTitle}</p>
                  <p className="adm-card__meta">{describeSlots(t)}</p>
                  <p className="adm-card__meta">
                    {t.startsOn} → {t.endsOn} · {t.timeZone} · {t.classCount} class{t.classCount === 1 ? '' : 'es'} ·{' '}
                    {host ? `Instructor: ${host.name || host.email}` : t.hostUserId ? 'Instructor assigned' : 'No instructor yet'}
                  </p>
                </div>
                <div className="adm-card__actions">
                  {confirmDelete === t.id ? (
                    <>
                      <span className="adm-muted">Delete this and its not-yet-started classes?</span>
                      <button type="button" className="adm-btn adm-btn--danger" disabled={busyId === t.id} onClick={() => remove(t.id)}>
                        Delete
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="adm-btn adm-btn--primary" disabled={busyId === t.id} onClick={() => generate(t.id)}>
                        {busyId === t.id ? 'Working…' : 'Generate classes'}
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setForm(fromTimetable(t)); setNotice(undefined); setError(undefined); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        Edit
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(t.id)}>
                        Delete
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
