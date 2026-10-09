import { useState } from 'react';
import type { FormEvent } from 'react';

/** Asks for the reason before revoking -- same shape as SuspendForm.tsx, for a certificate instead of an account. The reason is stored, shown on the public verify page, and written to the audit log. */
export function RevokeCertificateForm({
  courseTitle,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  courseTitle: string;
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
        Revoke the certificate for <strong>{courseTitle}</strong>? The public verify page will show it as revoked, with
        this reason, instead of valid.
      </p>
      <label className="adm-field">
        <span>Reason (kept in the audit log, shown on the verify page)</span>
        <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? <p className="adm-error" role="alert">{error}</p> : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--danger" disabled={busy || reason.trim().length < 3}>
          {busy ? 'Revoking…' : 'Revoke certificate'}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
