import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminAccountSummary, AdminCredentials } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { useAdminAdmins } from './adminData';

/** The one moment the temporary password exists in the UI. It is not stored anywhere and can't be shown again. Same shape as AdminInstructorsPage.tsx's CredentialsPanel. */
function CredentialsPanel({ creds, onDone }: { creds: AdminCredentials; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const signInUrl = `${window.location.origin}/staff/login`;
  const message = `AIIT admin sign-in\nAddress: ${signInUrl}\nEmail: ${creds.admin.email ?? ''}\nTemporary password: ${creds.temporaryPassword}\nYou will be asked to choose your own password when you first sign in.`;

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
      <h2>Sign-in details for {creds.admin.name}</h2>
      <p>
        Give these to the new admin now. <strong>This is the only time the password is shown</strong> — if it is lost,
        they can reset their own password the same way any staff account does once signed in.
      </p>
      <dl className="adm-dl">
        <div>
          <dt>Sign in at</dt>
          <dd>{signInUrl}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{creds.admin.email}</dd>
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

export default function AdminAdminsPage() {
  const admins = useAdminAdmins();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [creds, setCreds] = useState<AdminCredentials | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const result = await apiFetch<AdminCredentials>('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      setCreds(result);
      setAdding(false);
      setForm({ name: '', email: '' });
      admins.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the admin account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">People</p>
          <h1 className="adm-title">Admins</h1>
          <p className="adm-intro">
            Administrator accounts, same as instructors — you create the login here and hand over a temporary password.
            They sign in at /staff/login and choose their own password straight away. An admin account can&apos;t be
            suspended from this screen, only created.
          </p>
        </div>
        {!adding ? (
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setAdding(true); setError(undefined); }}>
            Add admin
          </button>
        ) : null}
      </div>

      {creds ? <CredentialsPanel creds={creds} onDone={() => setCreds(null)} /> : null}
      {error && !adding ? <p className="adm-error" role="alert">{error}</p> : null}

      {adding ? (
        <form className="adm-form" onSubmit={handleCreate}>
          <h2 className="adm-form__title">New admin</h2>
          <div className="adm-grid">
            <label className="adm-field">
              <span>Full name</span>
              <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Email (their sign-in)</span>
              <input required type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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

      {admins.status === 'loading' ? <p className="adm-muted">Loading admins…</p> : null}
      {admins.status === 'error' ? <p className="adm-error" role="alert">{admins.message}</p> : null}
      {admins.status === 'ready' && admins.data.length === 0 && !adding ? (
        <p className="adm-muted">No admin accounts yet besides your own.</p>
      ) : null}

      {admins.status === 'ready' && admins.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {admins.data.map((a: AdminAccountSummary) => (
            <li className="adm-card" key={a.id}>
              <div className="adm-card__main">
                <h3>{a.name ?? 'No name'}</h3>
                <p className="adm-card__meta">{a.email ?? 'No email on record'}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
