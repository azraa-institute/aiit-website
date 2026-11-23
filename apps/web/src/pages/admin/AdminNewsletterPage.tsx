import { useState } from 'react';
import type { AdminNewsletterIssue } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { formatWhen, useAdminFetch } from './adminData';

export default function AdminNewsletterPage() {
  const subscriberCount = useAdminFetch<{ count: number }>('/admin/newsletter/subscriber-count');
  const issues = useAdminFetch<AdminNewsletterIssue[]>('/admin/newsletter/issues');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<AdminNewsletterIssue>();
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testError, setTestError] = useState<string>();
  const [testSent, setTestSent] = useState(false);

  const canSend = subject.trim().length > 0 && bodyText.trim().length > 0;

  async function sendTest() {
    setTestSending(true);
    setTestError(undefined);
    setTestSent(false);
    try {
      await apiFetch('/admin/newsletter/test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim(), subject: subject.trim(), bodyText: bodyText.trim() }),
      });
      setTestSent(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Could not send that test email.');
    } finally {
      setTestSending(false);
    }
  }

  async function send() {
    setSending(true);
    setError(undefined);
    setSent(undefined);
    try {
      const issue = await apiFetch<AdminNewsletterIssue>('/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), bodyText: bodyText.trim() }),
      });
      setSent(issue);
      setSubject('');
      setBodyText('');
      setConfirming(false);
      issues.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that newsletter.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">Newsletter</h1>
          <p className="adm-intro">
            Compose a broadcast and send it directly to every confirmed (opted-in) newsletter subscriber. Each
            recipient gets their own unsubscribe link; sending is immediate and cannot be undone.
          </p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card__main">
          <label className="adm-field adm-field--wide">
            <span>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} disabled={sending} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Body (one paragraph per line)</span>
            <textarea rows={10} value={bodyText} onChange={(e) => setBodyText(e.target.value)} disabled={sending} />
          </label>

          <label className="adm-field adm-field--wide">
            <span>Send a test to (optional, doesn't touch your subscriber list)</span>
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              disabled={testSending}
            />
          </label>
          {testError ? <p className="adm-error" role="alert">{testError}</p> : null}
          {testSent ? <p className="adm-muted">Test email sent to {testTo}.</p> : null}
          <div className="adm-card__actions">
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={!canSend || !testTo.trim() || testSending}
              onClick={() => void sendTest()}
            >
              {testSending ? 'Sending test…' : 'Send test email'}
            </button>
          </div>

          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          {sent ? (
            <p className="adm-muted">
              Sent to {sent.sentCount} subscriber{sent.sentCount === 1 ? '' : 's'}.
            </p>
          ) : null}

          <div className="adm-card__actions">
            {confirming ? (
              <span className="adm-card__actions">
                <span>
                  Send to{' '}
                  {subscriberCount.status === 'ready' ? subscriberCount.data.count.toLocaleString() : '…'} confirmed
                  subscriber{subscriberCount.status === 'ready' && subscriberCount.data.count === 1 ? '' : 's'}?
                </span>
                <button type="button" className="adm-btn adm-btn--danger" disabled={sending} onClick={send}>
                  {sending ? 'Sending…' : 'Confirm send'}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={sending} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="adm-btn adm-btn--primary" disabled={!canSend} onClick={() => setConfirming(true)}>
                Send
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="adm-h2">Past issues</h2>
      {issues.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {issues.status === 'error' ? <p className="adm-error" role="alert">{issues.message}</p> : null}
      {issues.status === 'ready' ? (
        issues.data.length === 0 ? (
          <p className="adm-muted">No newsletters sent yet.</p>
        ) : (
          <ul className="adm-list" role="list">
            {issues.data.map((issue) => (
              <li className="adm-card" key={issue.id}>
                <div className="adm-card__main">
                  <h3>{issue.subject}</h3>
                  <p className="adm-card__meta">
                    {issue.sentAt ? `Sent ${formatWhen(issue.sentAt)} to ${issue.sentCount} subscriber${issue.sentCount === 1 ? '' : 's'}` : 'Not sent'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
