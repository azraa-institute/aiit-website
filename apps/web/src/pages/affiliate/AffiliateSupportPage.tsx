import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ComplaintDetail, ComplaintStatus, ComplaintSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiFetch } from '@/lib/useApiFetch';
import { Button } from '@/components/primitives/Button';
import { TextArea, TextField } from '@/components/common/Field';
import '@/pages/portal/support.css';
import './affiliate-portal.css';

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  dismissed: 'Closed',
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Deliberately scoped to technical assistance only -- no category picker,
 * no course/instructor fields (those are student-specific, see
 * portal/SupportPage.tsx). Every report this form sends is hardcoded to
 * the existing 'technical' ComplaintCategory, which already works for any
 * learner-role account -- an affiliate account is one under the hood, so
 * /me/complaints needs no backend change to support this.
 */
function NewReport({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await apiFetch('/me/complaints', {
        method: 'POST',
        body: JSON.stringify({ category: 'technical', subject, body }),
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
      <h2 className="support-form__title">Report a technical problem</h2>
      <p className="support-form__note">
        For a problem with the affiliate portal, your referral link, banners, or payouts. Your report goes only to the
        AIIT team, and we&apos;ll reply here in your portal.
      </p>

      <TextField label="Subject" required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <TextArea
        label="What happened?"
        required
        minLength={10}
        maxLength={5000}
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        hint="Include what you were doing, what you expected, and what happened instead."
      />

      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="support-form__actions">
        <Button as="button" type="submit" loading={sending}>
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
  if (state.status === 'error')
    return (
      <p className="auth__alert" role="alert">
        {state.message}
      </p>
    );
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
          <TextArea
            label={d.status === 'resolved' ? 'Still an issue? Reply to reopen it' : 'Add a message'}
            required
            maxLength={5000}
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          {error ? (
            <p className="auth__alert" role="alert">
              {error}
            </p>
          ) : null}
          <Button as="button" type="submit" size="sm" loading={sending} disabled={!reply.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AffiliateSupportPage() {
  const list = useApiFetch<ComplaintSummary[]>('/me/complaints');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (list.status === 'loading') return <p className="aff-loading">Loading…</p>;

  return (
    <div className="aff-dash">
      <section className="aff-card">
        <p className="aff-eyebrow">Promote AIIT</p>
        <h2>Support</h2>
        <p>
          Technical assistance only, problems with the affiliate portal, your referral link, banners, or payouts. For
          anything else, email{' '}
          <a href="mailto:info@aiit.network" className="aff-swipe-card__link">
            info@aiit.network
          </a>
          .
        </p>

        {sent ? (
          <p className="support-sent" role="status">
            Thank you. Your report has been sent. We will reply here, and you will get a notification.
          </p>
        ) : null}

        {creating ? (
          <NewReport
            onCancel={() => setCreating(false)}
            onDone={() => {
              setCreating(false);
              setSent(true);
              list.reload();
            }}
          />
        ) : (
          <div className="support-actions">
            <Button
              as="button"
              type="button"
              onClick={() => {
                setCreating(true);
                setSent(false);
              }}
            >
              Report a technical problem
            </Button>
          </div>
        )}
      </section>

      <section className="aff-card support-list">
        <h2>Your reports</h2>
        {list.status === 'error' ? (
          <p className="auth__alert" role="alert">
            {list.message}
          </p>
        ) : null}
        {list.status === 'ready' && list.data.length === 0 ? <p className="support-muted">You have not sent any reports.</p> : null}
        {list.status === 'ready' && list.data.length > 0 ? (
          <ul role="list">
            {list.data.map((c) => (
              <li key={c.id} className="support-item">
                <button
                  type="button"
                  className="support-item__head"
                  aria-expanded={open === c.id}
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                >
                  <span className="support-item__main">
                    <span className="support-item__subject">{c.subject}</span>
                    <span className="support-item__meta">{when(c.createdAt)}</span>
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
