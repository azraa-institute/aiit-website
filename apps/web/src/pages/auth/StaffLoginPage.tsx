import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { Me } from '@aiit/shared';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api';
import { invalidateMe, roleHome } from '@/lib/me';
import { needsMfaChallenge } from '@/lib/mfa';
import { AuthLayout } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';

/**
 * Sign-in for AIIT staff (admins and instructors) only. There is deliberately
 * no sign-up, Google or magic-link option here: staff accounts are created by
 * an administrator, who hands over a temporary password. A student account
 * that signs in here is turned away.
 */
export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suspended = searchParams.get('reason') === 'suspended';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);

  const canSubmit = /.+@.+\..+/.test(email) && password.length > 0 && !submitting;

  async function finishSignIn() {
    invalidateMe();
    let me: Me;
    try {
      me = await apiFetch<Me>('/auth/me');
    } catch (err) {
      // A suspended/deleted account is already being redirected by apiFetch.
      setSubmitting(false);
      setMfaPending(false);
      setError(err instanceof Error ? err.message : 'Could not sign you in right now.');
      return;
    }
    if (me.role === 'learner') {
      await supabase?.auth.signOut().catch(() => {});
      setSubmitting(false);
      setMfaPending(false);
      setError('This sign-in is for AIIT staff. Students sign in on the student sign-in page.');
      return;
    }
    navigate(me.mustChangePassword ? '/staff/change-password' : roleHome(me.role), { replace: true });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setSubmitting(false);
      // Deliberately generic -- never reveal whether the email exists.
      setError(
        signInError.message.toLowerCase().includes('banned')
          ? 'This account has been suspended. Contact the AIIT administrator.'
          : 'That email and password do not match.',
      );
      return;
    }
    if (await needsMfaChallenge()) {
      setSubmitting(false);
      setMfaPending(true);
      return;
    }
    await finishSignIn();
  }

  return (
    <>
      <Seo title="Staff Sign In" path="/staff/login" noindex />
      <AuthLayout
        title={mfaPending ? 'Two-factor authentication' : 'Staff sign-in'}
        intro={
          mfaPending
            ? 'Enter the code from your authenticator app to finish signing in.'
            : 'For AIIT administrators and instructors. Use the credentials the AIIT team gave you.'
        }
        footer={
          <>
            Are you a student? <Link to="/login">Student sign-in</Link>
          </>
        }
      >
        {mfaPending ? (
          <MfaChallenge onVerified={finishSignIn} />
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {suspended && !error ? (
              <p className="auth__alert" role="alert">
                Your account has been suspended. Contact the AIIT administrator.
              </p>
            ) : null}
            {error ? (
              <p className="auth__alert" role="alert">
                {error}
              </p>
            ) : null}
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="auth__aux">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={!canSubmit} loading={submitting}>
              Sign In
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
