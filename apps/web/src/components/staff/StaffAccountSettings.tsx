import { useState } from 'react';
import type { FormEvent } from 'react';
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
 * accounts, region/language preferences, 2FA, danger zone) -- those are
 * either learner-specific or not yet built for staff roles.
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
