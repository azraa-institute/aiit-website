import { Fragment, useState } from 'react';
import type { FormEvent } from 'react';
import type { ComplaintStatus, InstructorComplaintDetail, InstructorComplaintOptions, InstructorComplaintSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiFetch } from '@/lib/useApiFetch';
import { formatWhen } from '../admin/adminData';

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  dismissed: 'Closed',
};

function NewReport({ options, onDone, onCancel }: { options: InstructorComplaintOptions; onDone: () => void; onCancel: () => void }) {
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const course = options.courses.find((c) => c.id === courseId);
  const students = course ? course.students : options.courses.flatMap((c) => c.students);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await apiFetch('/instructor/complaints', {
        method: 'POST',
        body: JSON.stringify({ studentId, courseId: courseId || undefined, subject, body }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your report.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={submit}>
      <p className="adm-intro">Your report goes only to the AIIT team. The student is not notified that you filed it.</p>

      <label className="adm-field">
        <span>Course (optional)</span>
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setStudentId('');
          }}
        >
          <option value="">Any of my courses</option>
          {options.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>

      <label className="adm-field">
        <span>Student</span>
        <select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? 'Student'}
            </option>
          ))}
        </select>
      </label>

      <label className="adm-field">
        <span>Subject</span>
        <input required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="adm-field">
        <span>What happened?</span>
        <textarea
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Include dates and what you would like the AIIT team to do."
        />
      </label>

      {error ? (
        <p className="adm-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--primary" disabled={sending || !studentId}>
          {sending ? 'Sending…' : 'Send report'}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={sending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Thread({ id, onChanged }: { id: string; onChanged: () => void }) {
  const state = useApiFetch<InstructorComplaintDetail>(`/instructor/complaints/${id}`);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  if (state.status === 'loading') return <p className="adm-muted">Loading…</p>;
  if (state.status === 'error')
    return (
      <p className="adm-error" role="alert">
        {state.message}
      </p>
    );
  const d = state.data;

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await apiFetch(`/instructor/complaints/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: reply }) });
      setReply('');
      state.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="adm-thread">
      <div className="adm-msg">
        <p className="adm-msg__meta">You · {formatWhen(d.createdAt)}</p>
        <p className="adm-prewrap">{d.body}</p>
      </div>
      {d.messages.map((m) => (
        <div key={m.id} className={cn('adm-msg', m.from === 'admin' && 'adm-msg--admin')}>
          <p className="adm-msg__meta">
            {m.from === 'admin' ? 'AIIT team' : 'You'} · {formatWhen(m.createdAt)}
          </p>
          <p className="adm-prewrap">{m.body}</p>
        </div>
      ))}
      {d.status === 'dismissed' ? (
        <p className="adm-muted">This report is closed. If the issue continues, please file a new one.</p>
      ) : (
        <form className="adm-reply" onSubmit={send}>
          <label className="adm-field">
            <span>{d.status === 'resolved' ? 'Still an issue? Reply to reopen it' : 'Add a message'}</span>
            <textarea required maxLength={5000} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
          </label>
          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={sending || !reply.trim()}>
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function InstructorComplaintsPage() {
  const list = useApiFetch<InstructorComplaintSummary[]>('/instructor/complaints');
  const options = useApiFetch<InstructorComplaintOptions>('/instructor/complaints/options');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Support</p>
          <h1 className="adm-title">Report a student</h1>
          <p className="adm-intro">
            Tell the AIIT team about a problem with a student in one of your courses -- attendance, conduct, academic
            integrity, or anything else. Reports are private to the AIIT team; the student is not shown who filed it.
          </p>
        </div>
      </div>

      {sent ? (
        <p className="adm-muted" role="status">
          Thank you — your report has been sent. The AIIT team will reply here.
        </p>
      ) : null}

      {list.status === 'loading' || options.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}

      {creating && options.status === 'ready' ? (
        <NewReport
          options={options.data}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            setSent(true);
            list.reload();
          }}
        />
      ) : options.status === 'ready' ? (
        <div className="adm-actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={options.data.courses.length === 0}
            onClick={() => {
              setCreating(true);
              setSent(false);
            }}
          >
            Report a student
          </button>
          {options.data.courses.length === 0 ? <p className="adm-muted">You have no courses with enrolled students yet.</p> : null}
        </div>
      ) : null}

      <section aria-labelledby="my-reports" style={{ marginTop: '2rem' }}>
        <p id="my-reports" className="adm-eyebrow">
          Your reports
        </p>
        {list.status === 'error' ? (
          <p className="adm-error" role="alert">
            {list.message}
          </p>
        ) : null}
        {list.status === 'ready' && list.data.length === 0 ? <p className="adm-muted">You have not filed any reports.</p> : null}
        {list.status === 'ready' && list.data.length > 0 ? (
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((c) => (
                  <Fragment key={c.id}>
                    <tr className={cn(open === c.id && 'is-selected')}>
                      <td>
                        <button type="button" className="adm-linkbtn" onClick={() => setOpen(open === c.id ? null : c.id)}>
                          {c.subject}
                        </button>
                      </td>
                      <td>{c.studentName ?? '—'}</td>
                      <td>{c.courseTitle ?? '—'}</td>
                      <td>{formatWhen(c.updatedAt)}</td>
                      <td>
                        <span className={cn('adm-status', `adm-status--c-${c.status}`)}>{STATUS_LABEL[c.status]}</span>
                      </td>
                    </tr>
                    {open === c.id ? (
                      <tr>
                        <td colSpan={5}>
                          <Thread id={c.id} onChanged={list.reload} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
