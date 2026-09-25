import { useState } from 'react';
import type { FormEvent } from 'react';
import { COMPLAINT_CATEGORY_LABEL } from '@/data/complaintCategories';
import type { ComplaintCategory, ComplaintDetail, ComplaintOptions, ComplaintStatus, ComplaintSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiFetch } from '@/lib/useApiFetch';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { Button } from '@/components/primitives/Button';
import { SelectField, TextArea, TextField } from '@/components/common/Field';
import { PortalLoader } from './PortalLoader';
import './portal.css';
import './support.css';

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  dismissed: 'Closed',
};

const CATEGORY_OPTIONS = (Object.keys(COMPLAINT_CATEGORY_LABEL) as ComplaintCategory[]).map((value) => ({
  value,
  label: COMPLAINT_CATEGORY_LABEL[value],
}));

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function NewReport({ options, onDone, onCancel }: { options: ComplaintOptions; onDone: () => void; onCancel: () => void }) {
  const [category, setCategory] = useState<ComplaintCategory>('learning_issue');
  const [courseId, setCourseId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const course = options.courses.find((c) => c.id === courseId);
  const aboutInstructor = category === 'instructor';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await apiFetch('/me/complaints', {
        method: 'POST',
        body: JSON.stringify({
          category,
          subject,
          body,
          courseId: courseId || undefined,
          instructorId: aboutInstructor && instructorId ? instructorId : undefined,
        }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your report.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="support-form" onSubmit={submit}>
      <h2 className="support-form__title">Report a problem</h2>
      <p className="support-form__note">
        Your report goes only to the AIIT team. Instructors never see it, and we will reply here in your portal.
      </p>

      <SelectField
        label="What is this about?"
        required
        value={category}
        onChange={(e) => {
          setCategory(e.target.value as ComplaintCategory);
          setInstructorId('');
        }}
        options={CATEGORY_OPTIONS}
      />

      <SelectField
        label={aboutInstructor ? 'Which course do they teach you on?' : 'Which course? (optional)'}
        required={aboutInstructor}
        value={courseId}
        onChange={(e) => {
          setCourseId(e.target.value);
          setInstructorId('');
        }}
        options={[
          { value: '', label: aboutInstructor ? 'Select a course…' : 'Not about a specific course' },
          ...options.courses.map((c) => ({ value: c.id, label: c.title })),
        ]}
      />

      {aboutInstructor ? (
        <SelectField
          label="Which instructor?"
          required
          value={instructorId}
          onChange={(e) => setInstructorId(e.target.value)}
          disabled={!course}
          hint={course && course.instructors.length === 0 ? 'No instructor is assigned to this course yet.' : undefined}
          options={[
            { value: '', label: course ? 'Select an instructor…' : 'Choose a course first' },
            ...(course?.instructors ?? []).map((i) => ({ value: i.id, label: i.name ?? 'Instructor' })),
          ]}
        />
      ) : null}

      <TextField label="Subject" required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <TextArea
        label="What happened?"
        required
        minLength={10}
        maxLength={5000}
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        hint="Include dates, the class or assignment involved, and what you would like us to do."
      />

      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="support-form__actions">
        <Button as="button" type="submit" loading={sending} disabled={aboutInstructor && !instructorId}>
          Send report
        </Button>
        <Button as="button" type="button" variant="secondary" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Thread({ id, onChanged }: { id: string; onChanged: () => void }) {
  const state = useApiFetch<ComplaintDetail>(`/me/complaints/${id}`);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  if (state.status === 'loading') return <p className="support-muted">Loading…</p>;
  if (state.status === 'error') return <p className="auth__alert" role="alert">{state.message}</p>;
  const d = state.data;

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await apiFetch(`/me/complaints/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: reply }) });
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
    <div className="support-thread">
      <div className="support-msg support-msg--student">
        <p className="support-msg__meta">You · {when(d.createdAt)}</p>
        <p className="support-msg__body">{d.body}</p>
      </div>
      {d.messages.map((m) => (
        <div key={m.id} className={cn('support-msg', m.from === 'admin' ? 'support-msg--admin' : 'support-msg--student')}>
          <p className="support-msg__meta">
            {m.from === 'admin' ? 'AIIT team' : 'You'} · {when(m.createdAt)}
          </p>
          <p className="support-msg__body">{m.body}</p>
        </div>
      ))}
      {d.status === 'dismissed' ? (
        <p className="support-muted">This report is closed. If the problem continues, please open a new one.</p>
      ) : (
        <form className="support-reply" onSubmit={send}>
          <TextArea label={d.status === 'resolved' ? 'Still an issue? Reply to reopen it' : 'Add a message'} required maxLength={5000} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
          {error ? <p className="auth__alert" role="alert">{error}</p> : null}
          <Button as="button" type="submit" size="sm" loading={sending} disabled={!reply.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

export default function SupportPage() {
  const list = useApiFetch<ComplaintSummary[]>('/me/complaints');
  const options = useApiFetch<ComplaintOptions>('/me/complaints/options');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useScrollReveal([list.status]);

  if (list.status === 'loading' || options.status === 'loading') return <PortalLoader label="Loading support" />;

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Support</p>
        <h1 className="portal-page__title">Help &amp; reports</h1>
        <p className="portal-page__intro">
          Tell the AIIT team about a problem with your learning, a course, a technical issue, or an instructor. Reports are
          private to the AIIT team.
        </p>
      </header>

      {sent ? (
        <p className="support-sent" role="status">
          Thank you — your report has been sent. We will reply here, and you will get a notification.
        </p>
      ) : null}

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
      ) : (
        <div className="support-actions">
          <Button as="button" type="button" onClick={() => { setCreating(true); setSent(false); }}>
            Report a problem
          </Button>
        </div>
      )}

      <section className="support-list" aria-labelledby="my-reports">
        <p id="my-reports" className="portal-eyebrow">
          Your reports
        </p>
        {list.status === 'error' ? <p className="auth__alert" role="alert">{list.message}</p> : null}
        {list.status === 'ready' && list.data.length === 0 ? (
          <p className="support-muted">You have not sent any reports.</p>
        ) : null}
        {list.status === 'ready' && list.data.length > 0 ? (
          <ul role="list">
            {list.data.map((c) => (
              <li key={c.id} className="support-item">
                <button type="button" className="support-item__head" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                  <span className="support-item__main">
                    <span className="support-item__subject">{c.subject}</span>
                    <span className="support-item__meta">
                      {COMPLAINT_CATEGORY_LABEL[c.category]}
                      {c.courseTitle ? ` · ${c.courseTitle}` : ''}
                      {c.instructorName ? ` · about ${c.instructorName}` : ''} · {when(c.createdAt)}
                    </span>
                  </span>
                  <span className={cn('support-status', `support-status--${c.status}`)}>{STATUS_LABEL[c.status]}</span>
                </button>
                {open === c.id ? <Thread id={c.id} onChanged={list.reload} /> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
