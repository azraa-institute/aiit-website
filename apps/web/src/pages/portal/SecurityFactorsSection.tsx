import { useEffect, useState } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { TextField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';
import { ShieldIcon, CopyIcon, CheckIcon } from './settings-icons';

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
  const [secretCopied, setSecretCopied] = useState(false);

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

    // An enrollment abandoned without clicking "Cancel" (tab closed, browser
    // crash, navigated away mid-QR-scan) leaves an unverified factor behind
    // server-side, with no record of it left client-side to clean up later.
    // Supabase then refuses a new enroll() under the same friendly name with
    // a confusing "already exists" error -- clear any of those out first so
    // re-enrolling always works.
    const stale = factors?.filter((f) => f.status === 'unverified') ?? [];
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    // issuer defaults to the Supabase project's own domain when omitted --
    // that's what was actually showing up in authenticator apps as the
    // entry name (alongside the account email, which TOTP's otpauth
    // format always shows regardless of issuer -- that part is standard
    // everywhere, e.g. a bank's authenticator entry reads "Chase: you@
    // email.com").
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
      issuer: 'AIIT',
    });
    setEnrolling(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setSecretCopied(false);
    setPending({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function handleCopySecret() {
    if (!pending) return;
    try {
      await navigator.clipboard.writeText(pending.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, non-secure context) --
      // the key is still shown as plain text, so this just skips the
      // "copied" confirmation rather than failing the enroll flow.
    }
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
    // Supabase's own native "MFA method added" security notification
    // (Dashboard -> Authentication -> Emails -> Security) handles telling
    // the user about this now -- no app-level call needed.
    await loadFactors();
  }

  async function handleCancelPending() {
    if (!supabase || !pending) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
    if (error) {
      setActionError(error.message);
      return;
    }
    setPending(null);
    setCode('');
    setActionError(undefined);
    setSecretCopied(false);
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
  const enabled = verifiedFactors.length > 0;

  return (
    <section id="two-factor" className="settings-section" data-reveal>
      <div className="settings-section__head">
        <span className="settings-section__icon">
          <ShieldIcon />
        </span>
        <h2 className="settings-section__title">Two-factor authentication</h2>
        {factors !== null ? (
          <span className={cn('settings-section__pill', enabled && 'settings-section__pill--on')}>
            {enabled ? 'Enabled' : 'Not enabled'}
          </span>
        ) : null}
      </div>
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
          {/* data.totp.qr_code from supabase.auth.mfa.enroll() is already a
              complete data: URI (confirmed against Supabase's own docs) --
              wrapping it in another data:image/svg+xml;utf-8, prefix (the
              previous code here) double-encoded it into something no
              browser can render, which is why the QR never showed up. */}
          <img
            src={pending.qrCode}
            alt="Authenticator QR code"
            className="settings-section__mfa-qr"
            width={180}
            height={180}
          />
          <p className="settings__body">Can&apos;t scan it? Enter this key manually:</p>
          <div className="settings-section__secret">
            <code>{pending.secret}</code>
            <button
              type="button"
              className="settings-section__copy"
              onClick={handleCopySecret}
              aria-label={secretCopied ? 'Copied' : 'Copy key'}
              title={secretCopied ? 'Copied' : 'Copy key'}
            >
              {secretCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
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
