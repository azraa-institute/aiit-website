import { useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { needsMfaChallenge } from '@/lib/mfa';
import { AuthLayout, GoogleAuthButton } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';

interface LocationState {
  from?: { pathname: string };
  authError?: string;
}

type Mode = 'password' | 'magic-link';

const EMAIL_RE = /.+@.+\..+/;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  // Set by lib/api.ts's hard redirect after a 403 "account deleted"
  // response -- a real page load, not client-side navigation, so it can
  // only carry this via the URL, not location.state like authError below.
  const [searchParams] = useSearchParams();
  const deleted = searchParams.get('reason') === 'deleted';
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(
    deleted ? undefined : state?.authError,
  );
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const emailError = emailTouched && email.length > 0 && !emailValid ? 'Enter a valid email address.' : undefined;
  const canSubmit = mode === 'password' ? emailValid && password.length > 0 : emailValid;

  function onEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }
  function onEmailBlur(_e: FocusEvent<HTMLInputElement>) {
    setEmailTouched(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailTouched(true);
    if (!canSubmit || submitting) return;

    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }

    if (mode === 'magic-link') {
      setError(undefined);
      setSubmitting(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        // shouldCreateUser: false -- this is a SIGN-IN form. Without it,
        // Supabase's default magic-link behaviour silently creates a brand
        // new account for any email typed here, bypassing Register's name
        // collection and terms acceptance entirely.
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false },
      });
      setSubmitting(false);

      if (otpError) {
        setError(
          otpError.message.toLowerCase().includes('signups not allowed')
            ? "We couldn't find an AIIT account for that email. Check the address, or create an account instead."
            : otpError.message,
        );
        return;
      }
      setMagicLinkSent(true);
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

    if (await needsMfaChallenge()) {
      setMfaPending(true);
      return;
    }

    navigate(state?.from?.pathname ?? '/portal', { replace: true });
  }

  function onMfaVerified() {
    navigate(state?.from?.pathname ?? '/portal', { replace: true });
  }

  async function onOAuthSignIn(provider: 'google') {
    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
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
        title={mfaPending ? 'Two-factor authentication' : deleted ? 'Account deleted' : 'Welcome back'}
        intro={
          mfaPending
            ? 'Enter the code from your authenticator app to finish signing in.'
            : deleted
              ? "Your AIIT account has been deleted. You're welcome to create a new one any time."
              : 'Sign in to continue your courses, track progress and access your certificates.'
        }
        social={
          magicLinkSent || mfaPending ? undefined : (
            <>
              <GoogleAuthButton onClick={() => onOAuthSignIn('google')} />
            </>
          )
        }
        footer={
          <>
            No account? <Link to="/register">Sign Up</Link>
          </>
        }
      >
        {mfaPending ? (
          <MfaChallenge onVerified={onMfaVerified} />
        ) : magicLinkSent ? (
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
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={onEmailChange}
              onBlur={onEmailBlur}
              error={emailError}
            />
            {mode === 'password' && (
              <>
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
              </>
            )}
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={!canSubmit} loading={submitting}>
              {mode === 'password' ? 'Sign In' : 'Send magic link'}
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
