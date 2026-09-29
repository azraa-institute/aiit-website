import { useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import type { Me } from '@aiit/shared';
import { apiFetch, canEnterPortal } from '@/lib/api';
import { invalidateMe } from '@/lib/me';
import { needsMfaChallenge } from '@/lib/mfa';
import { AuthLayout, GoogleAuthButton } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';

interface LocationState {
  from?: { pathname: string };
  authError?: string;
  /** Set by AuthCallbackPage for a failure that could genuinely be a suspended account -- shows a Contact link under the error. */
  authErrorContact?: boolean;
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
  const suspendedRedirect = searchParams.get('reason') === 'suspended';
  const [staffAccount, setStaffAccount] = useState(false);
  // Set when a fresh sign-in attempt itself reveals the account is suspended
  // (Supabase refuses to issue a banned account a session at all, so this
  // can only be found by asking our own backend, not from Supabase's error
  // text -- see checkSuspended below). suspendedRedirect above covers the
  // other case: being signed in already and then getting suspended.
  const [suspendedNow, setSuspendedNow] = useState(false);
  const suspended = suspendedRedirect || suspendedNow;
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

  /**
   * A banned Supabase account never gets a session -- Supabase refuses at
   * sign-in time, before our own JwtGuard ever runs -- so its error text is
   * all we'd otherwise have to go on, and that text doesn't reliably say
   * "suspended" (it can read as a generic invalid-credentials/expired-link
   * message instead). Asking our own backend, keyed by the email just
   * typed, gives a definite answer instead of guessing from Supabase's
   * wording. Never throws -- a failed check just means the original,
   * Supabase-supplied message is shown instead.
   */
  async function checkSuspended(candidateEmail: string): Promise<boolean> {
    try {
      const { status } = await apiFetch<{ status: 'active' | 'suspended' | 'not_found' }>(
        `/auth/account-status?email=${encodeURIComponent(candidateEmail)}`,
      );
      return status === 'suspended';
    } catch {
      return false;
    }
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
      setSuspendedNow(false);
      setSubmitting(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        // shouldCreateUser: false -- this is a SIGN-IN form. Without it,
        // Supabase's default magic-link behaviour silently creates a brand
        // new account for any email typed here, bypassing Register's name
        // collection and terms acceptance entirely.
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false },
      });

      if (otpError) {
        if (await checkSuspended(email)) {
          setSubmitting(false);
          setSuspendedNow(true);
          return;
        }
        setSubmitting(false);
        setError(
          otpError.message.toLowerCase().includes('signups not allowed')
            ? "We couldn't find an AIIT account for that email. Check the address, or create an account instead."
            : otpError.message,
        );
        return;
      }
      setSubmitting(false);
      setMagicLinkSent(true);
      return;
    }

    setError(undefined);
    setSuspendedNow(false);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      if (await checkSuspended(email)) {
        setSubmitting(false);
        setSuspendedNow(true);
        return;
      }
      setSubmitting(false);
      setError(
        signInError.message.toLowerCase().includes('confirm')
          ? 'Confirm your email address before signing in -- check your inbox for the link we sent.'
          : signInError.message,
      );
      return;
    }

    if (await needsMfaChallenge()) {
      setSubmitting(false);
      setMfaPending(true);
      return;
    }

    await enterPortal();
  }

  // Shared by the password and MFA sign-in paths, both of which land here
  // once Supabase considers the caller signed in. Checks the account is
  // still real before navigating -- see canEnterPortal()'s own comment for
  // why that matters. Deliberately does nothing in the false branch: a
  // hard redirect to /login?reason=deleted is already under way by then.
  async function enterPortal() {
    if (!(await canEnterPortal())) {
      setSubmitting(false);
      return;
    }
    // Staff (admin/instructor) have their own sign-in page and portals -- a
    // staff account that signs in here is turned away rather than let into
    // the student portal.
    invalidateMe();
    try {
      const me = await apiFetch<Me>('/auth/me');
      if (me.role !== 'learner') {
        await supabase?.auth.signOut().catch(() => {});
        setSubmitting(false);
        setMfaPending(false);
        setStaffAccount(true);
        setError('This is an AIIT staff account, so it cannot sign in here.');
        return;
      }
    } catch {
      // Fall through -- the portal's own error state covers a transient failure.
    }
    navigate(state?.from?.pathname ?? '/portal', { replace: true });
  }

  async function onMfaVerified() {
    await enterPortal();
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
    setSuspendedNow(false);
    setMagicLinkSent(false);
    setMode((m) => (m === 'password' ? 'magic-link' : 'password'));
  }

  return (
    <>
      <Seo title="Sign In" path="/login" noindex />
      <AuthLayout
        title={mfaPending ? 'Two-factor authentication' : deleted ? 'Account deleted' : suspended ? 'Account suspended' : 'Welcome back'}
        intro={
          mfaPending
            ? 'Enter the code from your authenticator app to finish signing in.'
            : deleted
              ? "Your AIIT account has been deleted. You're welcome to create a new one any time."
              : suspended
                ? (
                    <>
                      Your account has been suspended. If you think this is a mistake, please{' '}
                      <Link to="/contact">contact the AIIT team</Link>.
                    </>
                  )
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
            {error && state?.authErrorContact && (
              <p className="auth__aux">
                <Link to="/contact">Contact the AIIT team</Link>
              </p>
            )}
            {staffAccount && (
              <p className="auth__aux">
                <Link to="/staff/login">Go to the staff sign-in</Link>
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
