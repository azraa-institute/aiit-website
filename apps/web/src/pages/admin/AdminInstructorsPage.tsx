import { useState } from 'react';
import type { FormEvent } from 'react';
import type { InstructorSummary, StaffCredentials, SuspendResult } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAdminInstructors } from './adminData';
import { SuspendForm } from './SuspendForm';

/** The one moment the temporary password exists in the UI. It is not stored anywhere and can't be shown again. */
function CredentialsPanel({ creds, onDone }: { creds: StaffCredentials; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const signInUrl = `${window.location.origin}/staff/login`;
  const message = `AIIT instructor sign-in\nAddress: ${signInUrl}\nEmail: ${creds.instructor.email ?? ''}\nTemporary password: ${creds.temporaryPassword}\nYou will be asked to choose your own password when you first sign in.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="adm-creds" role="alert" aria-label="Sign-in details">
      <h2>Sign-in details for {creds.instructor.name}</h2>
      <p>
        Give these to the instructor now. <strong>This is the only time the password is shown</strong> — if it is lost, reset
        it and a new one is generated.
      </p>
      <dl className="adm-dl">
        <div>
          <dt>Sign in at</dt>
          <dd>{signInUrl}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{creds.instructor.email}</dd>
        </div>
        <div>
          <dt>Temporary password</dt>
          <dd>
            <code className="adm-code">{creds.temporaryPassword}</code>
          </dd>
        </div>
      </dl>
      <div className="adm-actions">
        <button type="button" className="adm-btn adm-btn--primary" onClick={copy}>
          {copied ? 'Copied' : 'Copy details'}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
          I have passed these on
        </button>
      </div>
    </section>
  );
}

export default function AdminInstructorsPage() {
  const instructors = useAdminInstructors();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', headline: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [creds, setCreds] = useState<StaffCredentials | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const result = await apiFetch<StaffCredentials>('/admin/instructors', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email, headline: form.headline || undefined }),
      });
      setCreds(result);
      setAdding(false);
      setForm({ name: '', email: '', headline: '' });
      instructors.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the instructor.');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(id: string) {
    setBusyId(id);
    setError(undefined);
    try {
      setCreds(await apiFetch<StaffCredentials>(`/admin/instructors/${id}/reset-password`, { method: 'POST' }));
      setConfirmResetId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusyId(null);
    }
  }

  async function suspend(id: string, reason: string) {
    setBusyId(id);
    setError(undefined);
    try {
      const r = await apiFetch<SuspendResult>(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
      setSuspendingId(null);
      setNotice(
        r.affectedUpcomingClasses > 0
          ? `Suspended. ${r.affectedUpcomingClasses} upcoming class${r.affectedUpcomingClasses === 1 ? ' still names' : 'es still name'} them as instructor — reassign ${r.affectedUpcomingClasses === 1 ? 'it' : 'them'} on the Classes page.`
          : 'Suspended.',
      );
      instructors.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suspend the account.');
    } finally {
      setBusyId(null);
    }
  }

  async function reactivate(id: string) {
    setBusyId(id);
    setError(undefined);
    try {
      await apiFetch<SuspendResult>(`/admin/users/${id}/reactivate`, { method: 'POST' });
      setNotice('Account reactivated.');
      instructors.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reactivate the account.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">People</p>
          <h1 className="adm-title">Instructors</h1>
          <p className="adm-intro">
            Instructors don&apos;t sign up — you create their login here and give them a temporary password. They sign in at
            /staff/login and choose their own password straight away.
          </p>
        </div>
        {!adding ? (
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setAdding(true); setNotice(undefined); setError(undefined); }}>
            Add instructor
          </button>
        ) : null}
      </div>

      {creds ? <CredentialsPanel creds={creds} onDone={() => setCreds(null)} /> : null}
      {notice ? <p className="adm-notice" role="status">{notice}</p> : null}
      {error && !adding && !suspendingId ? <p className="adm-error" role="alert">{error}</p> : null}

      {adding ? (
        <form className="adm-form" onSubmit={handleCreate}>
          <h2 className="adm-form__title">New instructor</h2>
          <div className="adm-grid">
            <label className="adm-field">
              <span>Full name</span>
              <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Email (their sign-in)</span>
              <input required type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Title or headline (optional)</span>
              <input maxLength={160} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            </label>
          </div>
          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create account'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {instructors.status === 'loading' ? <p className="adm-muted">Loading instructors…</p> : null}
      {instructors.status === 'error' ? <p className="adm-error" role="alert">{instructors.message}</p> : null}
      {instructors.status === 'ready' && instructors.data.length === 0 && !adding ? (
        <p className="adm-muted">No instructors yet. Add the first one to start assigning classes.</p>
      ) : null}

      {instructors.status === 'ready' && instructors.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {instructors.data.map((i: InstructorSummary) => (
            <li className="adm-card" key={i.id}>
              <div className="adm-card__main">
                <h3>
                  {i.name ?? 'No name'} <span className={cn('adm-status', `adm-status--${i.status}`)}>{i.status.replace('_', ' ')}</span>
                </h3>
                <p className="adm-card__meta">{i.email ?? 'No email on record'}</p>
                {i.headline ? <p className="adm-card__meta">{i.headline}</p> : null}
                <p className="adm-card__meta">
                  {i.upcomingClasses} upcoming class{i.upcomingClasses === 1 ? '' : 'es'}
                  {i.status === 'suspended' && i.suspendedReason ? ` · Suspended: ${i.suspendedReason}` : ''}
                </p>
                {suspendingId === i.id ? (
                  <SuspendForm
                    name={i.name ?? 'this instructor'}
                    busy={busyId === i.id}
                    error={error}
                    onCancel={() => setSuspendingId(null)}
                    onSubmit={(reason) => suspend(i.id, reason)}
                  />
                ) : null}
              </div>
              {suspendingId !== i.id ? (
                <div className="adm-card__actions">
                  {confirmResetId === i.id ? (
                    <>
                      <span className="adm-muted">Generate a new temporary password?</span>
                      <button type="button" className="adm-btn adm-btn--primary" disabled={busyId === i.id} onClick={() => resetPassword(i.id)}>
                        Reset
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmResetId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {i.status === 'active' ? (
                        <>
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmResetId(i.id)}>
                            Reset password
                          </button>
                          <button type="button" className="adm-btn adm-btn--danger" onClick={() => { setError(undefined); setSuspendingId(i.id); }}>
                            Suspend
                          </button>
                        </>
                      ) : null}
                      {i.status === 'suspended' ? (
                        <button type="button" className="adm-btn adm-btn--primary" disabled={busyId === i.id} onClick={() => reactivate(i.id)}>
                          Reactivate
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
