import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '');

    if (!email) {
      setError('Enter your email address.');
      return;
    }
    if (!supabase) {
      setError('Password reset is not configured yet.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    // Don't reveal whether the email exists -- the UI's copy already says
    // "if an account exists", so surface transport/config errors only.
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <Seo title="Lost Password" path="/forgot-password" noindex />
      <AuthLayout
        title="Lost Password?"
        intro="Enter the email on your AIIT account and we will send a secure reset link."
        footer={
          <>
            Remembered it? <Link to="/login">Sign In</Link>
          </>
        }
      >
        {sent ? (
          <p className="auth__done">
            If an account exists for that email, a reset link is on its way. The link expires in 60
            minutes. Check your spam folder if it does not arrive.
          </p>
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {error && (
              <p className="auth__alert" role="alert">
                {error}
              </p>
            )}
            <TextField label="Email" name="email" type="email" autoComplete="email" required />
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
