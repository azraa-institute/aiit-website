import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { PasswordField } from '@/components/common/Field';
import { PASSWORD_HINT, passwordMeetsRequirements, PasswordRequirementsList } from '@/components/common/PasswordRequirements';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api';
import { invalidateMe, roleHome, useMe } from '@/lib/me';
import { AuthLayout } from './AuthLayout';
import { LockIcon } from './StaffFieldIcons';

/**
 * First sign-in with a one-time password -- the learner-facing twin of
 * StaffChangePasswordPage.tsx. Reached the same way: RequireRole/
 * RequireAffiliate redirect here whenever Profile.mustChangePassword is
 * true and the account isn't staff. Today that's an affiliate application
 * AffiliatesService.applyNew() created (see its email), but the check
 * itself is generic to any learner account issued a temporary password.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const state = useMe();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordMeetsRequirements(password)) {
      setError(`${PASSWORD_HINT}.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('Password change is not configured yet.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }
    try {
      await apiFetch('/me/password-changed', { method: 'POST' });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Your password changed, but we could not finish. Please sign in again.');
      return;
    }
    invalidateMe();
    navigate(state.status === 'ready' ? roleHome(state.me.role) : '/login', { replace: true });
  }

  return (
    <>
      <Seo title="Set your password" path="/change-password" noindex />
      <AuthLayout
        title="Set your own password"
        intro="You signed in with a one-time password. Choose your own to continue -- only you should know it."
        footer={<>Need help? Contact the AIIT team.</>}
      >
        <form className="auth__form" onSubmit={onSubmit} noValidate>
          {error ? (
            <p className="auth__alert" role="alert">
              {error}
            </p>
          ) : null}
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="Enter your new password"
            icon={<LockIcon />}
            hint={PASSWORD_HINT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordRequirementsList password={password} />
          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            icon={<LockIcon />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button as="button" type="submit" size="lg" fullWidth arrow loading={submitting}>
            Save and continue
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
