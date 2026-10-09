import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { TextField, PasswordField } from '@/components/common/Field';
import { PASSWORD_HINT, passwordMeetsRequirements, PasswordRequirementsList } from '@/components/common/PasswordRequirements';

/**
 * Account settings shared by the admin and instructor portals -- same
 * Supabase Auth calls as the student portal's "Sign-in & security" section
 * (SettingsPage.tsx), just styled with the staff shell's .adm-* classes
 * instead of the student portal's .portal-page/.settings-section ones.
 * Staff accounts don't need the student portal's other sections (linked
 * accounts, region/language preferences, danger zone) -- those are
 * learner-specific. 2FA is included below: StaffLoginPage.tsx already
 * checks needsMfaChallenge() and renders MfaChallenge on sign-in (it was
 * built generically, not learner-only), so the only real gap was that
 * staff never had anywhere to actually enroll a factor -- Supabase's MFA
 * API itself is account-level, not role-gated, so enrolling here is all
 * that's needed for StaffLoginPage's existing check to start enforcing it.
 */
export function StaffAccountSettings() {
  const { session } = useAuth();
  const email = session?.user.email;

  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>();
  const [emailError, setEmailError] = useState<string>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState<string>();

  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [mfaLoadError, setMfaLoadError] = useState<string>();
  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactor, setPendingFactor] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [mfaActionError, setMfaActionError] = useState<string>();
  const [unenrollingId, setUnenrollingId] = useState<string>();

  useEffect(() => {
    void loadFactors();
  }, []);

  async function loadFactors() {
    if (!supabase) {
      setMfaLoadError('Not configured yet.');
      return;
    }
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMfaLoadError(error.message);
      return;
    }
    setFactors(data.totp);
  }

  async function handleEnroll() {
    if (!supabase) return;
    setMfaActionError(undefined);
    setEnrolling(true);
    // Same stale-unverified-factor cleanup as SecurityFactorsSection.tsx --
    // an abandoned enrollment (tab closed mid-QR-scan) otherwise makes a
    // re-enroll attempt fail with a confusing "already exists" error.
    const stale = factors?.filter((f) => f.status === 'unverified') ?? [];
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app', issuer: 'AIIT' });
    setEnrolling(false);
    if (error) {
      setMfaActionError(error.message);
      return;
    }
    setPendingFactor({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function handleVerify() {
    if (!supabase || !pendingFactor) return;
    setMfaActionError(undefined);
    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pendingFactor.factorId, code: mfaCode });
    setVerifying(false);
    if (error) {
      setMfaActionError(error.message);
      return;
    }
    setPendingFactor(null);
    setMfaCode('');
    await loadFactors();
  }

  async function handleCancelPending() {
    if (!supabase || !pendingFactor) return;
    await supabase.auth.mfa.unenroll({ factorId: pendingFactor.factorId });
    setPendingFactor(null);
    setMfaCode('');
    setMfaActionError(undefined);
  }

  async function handleUnenroll(factorId: string) {
    if (!supabase) return;
    setMfaActionError(undefined);
    setUnenrollingId(factorId);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setUnenrollingId(undefined);
    if (error) {
      setMfaActionError(error.message);
      return;
    }
    await loadFactors();
  }

  const verifiedFactors = factors?.filter((f) => f.status === 'verified') ?? [];

  async function handleEmailChange(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setEmailError('Not configured yet.');
      return;
    }
    setEmailError(undefined);
    setEmailMessage(undefined);
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message);
      return;
    }
    setEmailMessage('Check your new email address for a confirmation link. The change applies once you confirm it.');
    setNewEmail('');
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setPasswordError('Not configured yet.');
      return;
    }
    if (!passwordMeetsRequirements(newPassword)) {
      setPasswordError(`${PASSWORD_HINT}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError(undefined);
    setPasswordMessage(undefined);
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordMessage('Password updated.');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleSignOutEverywhere() {
    if (!supabase) return;
    setSigningOutEverywhere(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setSigningOutEverywhere(false);
    setSignOutMessage(error ? error.message : 'Signed out of every device. This one will sign out shortly.');
  }

  return (
    <>
      <form className="adm-form" onSubmit={handleEmailChange}>
        <h2 className="adm-form__title">Email address</h2>
        <p className="adm-muted">Current email <strong>{email ?? 'Signed in'}</strong></p>
        {emailError ? <p className="adm-error" role="alert">{emailError}</p> : null}
        {emailMessage ? <p className="adm-notice" role="status">{emailMessage}</p> : null}
        <div className="adm-grid">
          <TextField
            className="adm-field--wide"
            label="New email address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
        </div>
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={emailSaving}>
            {emailSaving ? 'Updating…' : 'Update email'}
          </button>
        </div>
      </form>

      <form className="adm-form" onSubmit={handlePasswordChange}>
        <h2 className="adm-form__title">Password</h2>
        {passwordError ? <p className="adm-error" role="alert">{passwordError}</p> : null}
        {passwordMessage ? <p className="adm-notice" role="status">{passwordMessage}</p> : null}
        <div className="adm-grid">
          <PasswordField label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint={PASSWORD_HINT} required />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <PasswordRequirementsList password={newPassword} />
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={passwordSaving}>
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>

      <form className="adm-form" onSubmit={(e) => e.preventDefault()}>
        <h2 className="adm-form__title">Two-factor authentication</h2>
        <p className="adm-muted">Add an authenticator app (Google Authenticator, 1Password, Authy) as a second sign-in step.</p>
        {mfaLoadError ? <p className="adm-error" role="alert">{mfaLoadError}</p> : null}
        {mfaActionError ? <p className="adm-error" role="alert">{mfaActionError}</p> : null}

        {factors !== null && verifiedFactors.length > 0 ? (
          <ul className="adm-plain">
            {verifiedFactors.map((f) => (
              <li key={f.id}>
                {f.friendly_name ?? 'Authenticator app'}
                <button type="button" className="adm-linkbtn" disabled={unenrollingId === f.id} onClick={() => handleUnenroll(f.id)}>
                  {unenrollingId === f.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!pendingFactor && factors !== null && verifiedFactors.length === 0 ? (
          <div className="adm-actions">
            <button type="button" className="adm-btn" disabled={enrolling} onClick={handleEnroll}>
              {enrolling ? 'Starting…' : 'Enable two-factor authentication'}
            </button>
          </div>
        ) : null}

        {pendingFactor ? (
          <div className="adm-grid">
            <p className="adm-muted adm-field--wide">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
            <img src={pendingFactor.qrCode} alt="Authenticator QR code" width={180} height={180} />
            <div>
              <p className="adm-muted">Can&apos;t scan it? Enter this key manually:</p>
              <code className="adm-code">{pendingFactor.secret}</code>
            </div>
            <TextField
              className="adm-field--wide"
              label="6-digit code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />
            <div className="adm-actions">
              <button type="button" className="adm-btn adm-btn--primary" disabled={verifying || mfaCode.length !== 6} onClick={handleVerify}>
                {verifying ? 'Verifying…' : 'Verify and enable'}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={handleCancelPending}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </form>

      <form className="adm-form" onSubmit={(e) => e.preventDefault()}>
        <h2 className="adm-form__title">Sessions</h2>
        <p className="adm-muted">If you think your account may be signed in somewhere you don&apos;t recognise, sign out of every device at once.</p>
        {signOutMessage ? <p className="adm-notice" role="status">{signOutMessage}</p> : null}
        <div className="adm-actions">
          <button type="button" className="adm-btn" disabled={signingOutEverywhere} onClick={handleSignOutEverywhere}>
            {signingOutEverywhere ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </div>
      </form>
    </>
  );
}
