import { useState } from 'react';
import type { AdminCourse } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { useAdminFetch, useAdminInstructors } from './adminData';

function CourseRow({
  course,
  instructors,
  onSaved,
}: {
  course: AdminCourse;
  instructors: { id: string; name: string | null; email: string | null }[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(course.instructors.map((i) => i.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const dirty = selected.slice().sort().join() !== course.instructors.map((i) => i.id).sort().join();

  function toggle(id: string) {
    setSaved(false);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await apiFetch(`/admin/courses/${course.id}/instructors`, {
        method: 'PUT',
        body: JSON.stringify({ instructorIds: selected }),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="adm-card">
      <div className="adm-card__main">
        <h3>{course.title}</h3>
        <p className="adm-card__meta">
          {course.enrolled} student{course.enrolled === 1 ? '' : 's'} enrolled
        </p>
        <fieldset className="adm-checks">
          <legend className="visually-hidden">Instructors for {course.title}</legend>
          {instructors.length === 0 ? (
            <p className="adm-muted">No active instructors yet — add one on the Instructors page.</p>
          ) : (
            instructors.map((i) => (
              <label key={i.id} className="adm-check">
                <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} />
                <span>{i.name ?? i.email ?? i.id.slice(0, 8)}</span>
              </label>
            ))
          )}
        </fieldset>
        {error ? <p className="adm-error" role="alert">{error}</p> : null}
      </div>
      <div className="adm-card__actions">
        {saved && !dirty ? <span className="adm-muted">Saved</span> : null}
        <button type="button" className="adm-btn adm-btn--primary" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save instructors'}
        </button>
      </div>
    </li>
  );
}

export default function AdminCoursesPage() {
  const courses = useAdminFetch<AdminCourse[]>('/admin/courses');
  const instructors = useAdminInstructors();
  const active = instructors.status === 'ready' ? instructors.data.filter((i) => i.status === 'active') : [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Programme</p>
          <h1 className="adm-title">Courses</h1>
          <p className="adm-intro">
            Choose who teaches each course. Generated timetables give the classes to that instructor, and they see the
            course, its students and its classes in their own portal.
          </p>
        </div>
      </div>

      {courses.status === 'loading' ? <p className="adm-muted">Loading courses…</p> : null}
      {courses.status === 'error' ? <p className="adm-error" role="alert">{courses.message}</p> : null}
      {courses.status === 'ready' ? (
        <ul className="adm-list" role="list">
          {courses.data.map((c) => (
            <CourseRow key={`${c.id}-${c.instructors.map((i) => i.id).join()}`} course={c} instructors={active} onSaved={courses.reload} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
