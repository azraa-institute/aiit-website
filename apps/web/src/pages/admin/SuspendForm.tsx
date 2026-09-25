import { useState } from 'react';
import type { FormEvent } from 'react';

/** Asks for the reason before suspending -- it is stored, shown to admins, and written to the audit log. */
export function SuspendForm({
  name,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  name: string;
  busy: boolean;
  error?: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(reason.trim());
  }

  return (
    <form className="adm-suspend" onSubmit={handleSubmit}>
      <p>
        Suspend <strong>{name}</strong>? They are signed out immediately and cannot sign in until you reactivate them.
      </p>
      <label className="adm-field">
        <span>Reason (kept in the audit log)</span>
        <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? <p className="adm-error" role="alert">{error}</p> : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--danger" disabled={busy || reason.trim().length < 3}>
          {busy ? 'Suspending…' : 'Suspend account'}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
