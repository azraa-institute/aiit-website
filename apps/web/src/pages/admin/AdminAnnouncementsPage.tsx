import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminAnnouncement, AnnouncementAudience } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { formatWhen, useAdminCourses, useAdminFetch } from './adminData';

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  all_students: 'All students',
  course: 'Students of one course',
  instructors: 'All instructors',
};

export default function AdminAnnouncementsPage() {
  const list = useAdminFetch<AdminAnnouncement[]>('/admin/announcements');
  const courses = useAdminCourses();
  const [audience, setAudience] = useState<AnnouncementAudience>('all_students');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [confirm, setConfirm] = useState(false);

  const courseList = courses.status === 'ready' ? courses.data : [];

  async function send() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const a = await apiFetch<AdminAnnouncement>('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ audience, courseId: audience === 'course' ? courseId : undefined, title, body }),
      });
      setNotice(`Sent to ${a.recipientCount} ${audience === 'instructors' ? 'instructor' : 'student'}${a.recipientCount === 1 ? '' : 's'}.`);
      setTitle('');
      setBody('');
      setConfirm(false);
      list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the announcement.');
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // A message to everyone can't be recalled, so it takes a second click.
    if (audience === 'all_students' && !confirm) {
      setConfirm(true);
      return;
    }
    void send();
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Communication</p>
          <h1 className="adm-title">Announcements</h1>
          <p className="adm-intro">
            Send a message to all students, the students of one course, or all instructors. Students receive it as a
            notification in their portal; instructors see it on their dashboard.
          </p>
        </div>
      </div>

      <form className="adm-form" onSubmit={handleSubmit}>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Send to</span>
            <select value={audience} onChange={(e) => { setAudience(e.target.value as AnnouncementAudience); setConfirm(false); }}>
              {(Object.keys(AUDIENCE_LABEL) as AnnouncementAudience[]).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          {audience === 'course' ? (
            <label className="adm-field">
              <span>Course</span>
              <select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Select a course…</option>
                {courseList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="adm-field adm-field--wide">
            <span>Title</span>
            <input required minLength={2} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Message</span>
            <textarea required rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
        </div>
        {error ? <p className="adm-error" role="alert">{error}</p> : null}
        {notice ? <p className="adm-notice" role="status">{notice}</p> : null}
        {confirm ? <p className="adm-error" role="alert">This goes to every student and cannot be recalled. Click again to send.</p> : null}
        <div className="adm-actions">
          <button type="submit" className={confirm ? 'adm-btn adm-btn--danger' : 'adm-btn adm-btn--primary'} disabled={busy || (audience === 'course' && !courseId)}>
            {busy ? 'Sending…' : confirm ? 'Yes, send to all students' : 'Send announcement'}
          </button>
          {confirm ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <h2 className="adm-h2">Sent</h2>
      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'ready' && list.data.length === 0 ? <p className="adm-muted">Nothing sent yet.</p> : null}
      {list.status === 'ready' && list.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {list.data.map((a) => (
            <li className="adm-card" key={a.id}>
              <div className="adm-card__main">
                <h3>{a.title}</h3>
                <p className="adm-card__meta">
                  {AUDIENCE_LABEL[a.audience]}
                  {a.courseTitle ? `: ${a.courseTitle}` : ''} · {a.recipientCount} recipient{a.recipientCount === 1 ? '' : 's'} · {formatWhen(a.createdAt)}
                </p>
                <p className="adm-prewrap">{a.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
