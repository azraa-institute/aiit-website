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

/** First sign-in for a staff account: replace the temporary password an administrator issued. */
export default function StaffChangePasswordPage() {
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
    navigate(state.status === 'ready' ? roleHome(state.me.role) : '/staff/login', { replace: true });
  }

  return (
    <>
      <Seo title="Set your password" path="/staff/change-password" noindex />
      <AuthLayout
        title="Set your own password"
        intro="You signed in with a temporary password. Choose a new one to continue — only you should know it."
        footer={<>Need help? Contact the AIIT administrator.</>}
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
