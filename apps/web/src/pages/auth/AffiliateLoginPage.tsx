import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { AffiliateMe, Me } from '@aiit/shared';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api';
import { invalidateMe } from '@/lib/me';
import { needsMfaChallenge } from '@/lib/mfa';
import { AuthLayout } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';
import { EnvelopeIcon, LockIcon } from './StaffFieldIcons';

const ASIDE_IMAGE = '/assets/auth/aiit-affiliate-portal.webp';

interface LocationState {
  from?: { pathname: string };
}

/**
 * Sign-in for AIIT affiliates only -- the staff login's twin. There is
 * deliberately no sign-up, Google or magic-link option here: affiliate
 * accounts are created server-side when an application is approved
 * (AffiliatesService.applyNew()/createManually()), which emails a one-time
 * password. A non-affiliate account (staff or a plain learner) that signs
 * in here is turned away.
 */
export default function AffiliateLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [searchParams] = useSearchParams();
  const suspendedRedirect = searchParams.get('reason') === 'suspended';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  // Set when a fresh sign-in attempt itself reveals the account is suspended
  // -- see LoginPage.tsx's checkSuspended for why this asks our own backend
  // rather than trusting Supabase's sign-in error text.
  const [suspendedNow, setSuspendedNow] = useState(false);
  const suspended = suspendedRedirect || suspendedNow;

  const canSubmit = /.+@.+\..+/.test(email) && password.length > 0 && !submitting;

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
    if (me.role !== 'learner') {
      await supabase?.auth.signOut().catch(() => {});
      setSubmitting(false);
      setMfaPending(false);
      setError('This sign-in is for AIIT affiliates. Staff sign in on the staff sign-in page.');
      return;
    }
    if (me.mustChangePassword) {
      navigate('/change-password', { replace: true });
      return;
    }
    try {
      const affiliateMe = await apiFetch<AffiliateMe>('/affiliates/me');
      if (!affiliateMe.hasApplied) {
        await supabase?.auth.signOut().catch(() => {});
        setSubmitting(false);
        setMfaPending(false);
        setError('This sign-in is for AIIT affiliates. Students sign in on the student sign-in page.');
        return;
      }
    } catch {
      await supabase?.auth.signOut().catch(() => {});
      setSubmitting(false);
      setMfaPending(false);
      setError('Could not confirm this is an affiliate account. Please try again.');
      return;
    }
    const dest = state?.from?.pathname?.startsWith('/affiliate-portal') ? state.from.pathname : '/affiliate-portal';
    navigate(dest, { replace: true });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }
    setError(undefined);
    setSuspendedNow(false);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      if (signInError.message.toLowerCase().includes('banned') || (await checkSuspended(email))) {
        setSubmitting(false);
        setSuspendedNow(true);
        return;
      }
      setSubmitting(false);
      // Deliberately generic -- never reveal whether the email exists.
      setError('That email and password do not match.');
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
      <Seo title="Affiliate Sign In" path="/affiliate/login" noindex />
      <AuthLayout
        layout="hero"
        asideImage={ASIDE_IMAGE}
        heroEyebrow="Affiliate Program"
        title={mfaPending ? 'Two-factor authentication' : 'Affiliate sign-in'}
        intro={
          mfaPending
            ? 'Enter the code from your authenticator app to finish signing in.'
            : 'For AIIT affiliates. Use the login details emailed when your application was approved.'
        }
      >
        {mfaPending ? (
          <MfaChallenge onVerified={finishSignIn} />
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {suspended && !error ? (
              <p className="auth__alert" role="alert">
                Your account has been suspended. If you think this is a mistake, please{' '}
                <Link to="/contact">contact the AIIT team</Link>.
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
              icon={<EnvelopeIcon />}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              icon={<LockIcon />}
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
