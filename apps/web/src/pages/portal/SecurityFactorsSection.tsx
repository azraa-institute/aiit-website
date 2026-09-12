import { useEffect, useState } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { TextField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';

/**
 * Two-factor authentication (TOTP) via Supabase Auth's MFA API -- a core
 * GoTrue capability, not an OAuth provider needing dashboard configuration,
 * so this works against the live project as-is. If enroll/verify ever fails
 * in a way that suggests MFA is actually unavailable for this project, that
 * error is surfaced plainly rather than hidden behind a fake success state.
 */
export function SecurityFactorsSection() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [unenrollingId, setUnenrollingId] = useState<string>();

  useEffect(() => {
    void loadFactors();
  }, []);

  async function loadFactors() {
    if (!supabase) {
      setLoadError('Not configured yet.');
      return;
    }
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setLoadError(error.message);
      return;
    }
    setFactors(data.totp);
  }

  async function handleEnroll() {
    if (!supabase) return;
    setActionError(undefined);
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
    setEnrolling(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setPending({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function handleVerify() {
    if (!supabase || !pending) return;
    setActionError(undefined);
    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pending.factorId, code });
    setVerifying(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setPending(null);
    setCode('');
    await loadFactors();
  }

  async function handleCancelPending() {
    if (!supabase || !pending) return;
    await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
    setPending(null);
    setCode('');
    setActionError(undefined);
  }

  async function handleUnenroll(factorId: string) {
    if (!supabase) return;
    setActionError(undefined);
    setUnenrollingId(factorId);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setUnenrollingId(undefined);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadFactors();
  }

  const verifiedFactors = factors?.filter((f) => f.status === 'verified') ?? [];

  return (
    <section className="settings-section" data-reveal>
      <h2 className="settings-section__title">Two-factor authentication</h2>
      <p className="settings__body">
        Add an authenticator app (Google Authenticator, 1Password, Authy) as a second sign-in step.
      </p>

      {loadError ? (
        <p className="auth__alert" role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className="auth__alert" role="alert">
          {actionError}
        </p>
      ) : null}

      {factors !== null && verifiedFactors.length > 0 ? (
        <ul className="settings-section__factor-list">
          {verifiedFactors.map((f) => (
            <li key={f.id} className="settings-section__factor">
              <span>{f.friendly_name ?? 'Authenticator app'}</span>
              <Button
                as="button"
                type="button"
                variant="ghost"
                size="sm"
                loading={unenrollingId === f.id}
                onClick={() => handleUnenroll(f.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {!pending && factors !== null && verifiedFactors.length === 0 ? (
        <Button as="button" type="button" variant="secondary" size="sm" loading={enrolling} onClick={handleEnroll}>
          Enable two-factor authentication
        </Button>
      ) : null}

      {pending ? (
        <div className="settings-section__mfa-enroll">
          <p className="settings__body">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <img
            src={`data:image/svg+xml;utf-8,${encodeURIComponent(pending.qrCode)}`}
            alt="Authenticator QR code"
            className="settings-section__mfa-qr"
            width={180}
            height={180}
          />
          <p className="settings__body">
            Can&apos;t scan it? Enter this key manually: <code>{pending.secret}</code>
          </p>
          <TextField
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <div className="settings-section__confirm-actions">
            <Button as="button" type="button" size="sm" loading={verifying} disabled={code.length !== 6} onClick={handleVerify}>
              Verify and enable
            </Button>
            <Button as="button" type="button" variant="ghost" size="sm" onClick={handleCancelPending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
