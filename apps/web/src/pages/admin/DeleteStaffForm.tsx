import { useState } from 'react';
import type { FormEvent } from 'react';

/** Asks for the reason before deleting -- same shape as SuspendForm.tsx, for a permanent (not reversible from this UI) instructor-account deletion instead of a suspension. The reason is kept in the audit log, not shown to the deleted account. */
export function DeleteStaffForm({
  name,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  name: string;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(reason.trim());
  }

  return (
    <form className="adm-suspend" onSubmit={handleSubmit}>
      <p>
        Delete <strong>{name}</strong>&apos;s account? They are signed out immediately and cannot sign in again. This
        is not reversible from here -- undoing it needs direct database access.
      </p>
      <label className="adm-field">
        <span>Reason (kept in the audit log)</span>
        <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? <p className="adm-error" role="alert">{error}</p> : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--danger" disabled={busy || reason.trim().length < 3}>
          {busy ? 'Deleting…' : 'Delete account'}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
