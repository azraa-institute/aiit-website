import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { AuthLayout, GoogleAuthButton } from './AuthLayout';

interface LocationState {
  from?: { pathname: string };
  authError?: string;
}

type Mode = 'password' | 'magic-link';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [mode, setMode] = useState<Mode>('password');
  const [error, setError] = useState<string | undefined>(state?.authError);
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '');

    if (!email) {
      setError(mode === 'password' ? 'Enter your email and password.' : 'Enter your email address.');
      return;
    }
    if (!/.+@.+\..+/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }

    if (mode === 'magic-link') {
      setError(undefined);
      setSubmitting(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setSubmitting(false);

      if (otpError) {
        setError(otpError.message);
        return;
      }
      setMagicLinkSent(true);
      return;
    }

    const password = String(data.get('password') ?? '');
    if (!password) {
      setError('Enter your email and password.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('confirm')
          ? 'Confirm your email address before signing in -- check your inbox for the link we sent.'
          : signInError.message,
      );
      return;
    }

    navigate(state?.from?.pathname ?? '/portal', { replace: true });
  }

  async function onGoogleSignIn() {
    if (!supabase) {
      setError('Google sign-in is not configured yet.');
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  function toggleMode() {
    setError(undefined);
    setMagicLinkSent(false);
    setMode((m) => (m === 'password' ? 'magic-link' : 'password'));
  }

  return (
    <>
      <Seo title="Sign In" path="/login" noindex />
      <AuthLayout
        title="Welcome back"
        intro="Sign in to continue your courses, track progress and access your certificates."
        social={magicLinkSent ? undefined : <GoogleAuthButton onClick={onGoogleSignIn} />}
        footer={
          <>
            No account? <Link to="/register">Sign Up</Link>
          </>
        }
      >
        {magicLinkSent ? (
          <p className="auth__done">
            Check your inbox for a sign-in link. It expires shortly and only works once.
          </p>
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {error && (
              <p className="auth__alert" role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 1.5 15 14H1L8 1.5Zm0 4.5v3.5M8 11.2v.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {error}
              </p>
            )}
            <TextField label="Email" name="email" type="email" autoComplete="email" required />
            {mode === 'password' && (
              <>
                <PasswordField label="Password" name="password" autoComplete="current-password" required />
                <div className="auth__aux">
                  <Link to="/forgot-password">Lost Password?</Link>
                </div>
              </>
            )}
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={submitting}>
              {submitting
                ? mode === 'password'
                  ? 'Signing in…'
                  : 'Sending…'
                : mode === 'password'
                  ? 'Sign In'
                  : 'Send magic link'}
            </Button>
            <button type="button" className="auth__mode-toggle" onClick={toggleMode}>
              {mode === 'password' ? 'Or sign in with a magic link instead' : 'Or sign in with your password instead'}
            </button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
