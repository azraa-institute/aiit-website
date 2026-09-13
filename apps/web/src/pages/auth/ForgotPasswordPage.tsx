import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch, ApiError } from '@/lib/api';
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

    // Checked explicitly (not the enumeration-safe "if an account exists"
    // wording most reset flows use) -- a deliberate product choice made
    // knowing it lets someone confirm whether a given email has an AIIT
    // account. Accepted because RegisterPage already reveals the same
    // thing on a duplicate signup attempt, so this isn't new exposure, and
    // a real user who mistyped their email gets a clear answer instead of
    // a permanently unexplained "nothing arrived".
    try {
      const { exists } = await apiFetch<{ exists: boolean }>(
        `/auth/email-exists?email=${encodeURIComponent(email)}`,
      );
      if (!exists) {
        setError("We couldn't find an AIIT account for that email.");
        setSubmitting(false);
        return;
      }
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof ApiError ? err.message : 'Could not check that email right now.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

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
            A reset link is on its way. It expires in 60 minutes. Check your spam folder if it does
            not arrive.
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
