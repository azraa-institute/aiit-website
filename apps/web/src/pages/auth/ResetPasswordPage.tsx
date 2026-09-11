import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { AuthLayout } from './AuthLayout';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');

    if (password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('Password reset is not configured yet.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  return (
    <>
      <Seo title="Reset Password" path="/reset-password" noindex />
      <AuthLayout
        title="Set a new password"
        intro="Choose a new password for your AIIT account."
        footer={
          <>
            Remembered it? <Link to="/login">Sign In</Link>
          </>
        }
      >
        {done ? (
          <p className="auth__done">
            Your password has been updated. <Link to="/login">Sign in</Link> with your new password.
          </p>
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {error && (
              <p className="auth__alert" role="alert">
                {error}
              </p>
            )}
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              hint="At least 8 characters"
              required
            />
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
