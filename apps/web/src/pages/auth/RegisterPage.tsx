import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { PasswordStrengthMeter } from '@/components/common/PasswordStrengthMeter';
import { supabase } from '@/lib/supabaseClient';
import { AuthLayout, GoogleAuthButton, AppleAuthButton } from './AuthLayout';

const EMAIL_RE = /.+@.+\..+/;
const MIN_PASSWORD_LENGTH = 8;
const ALREADY_REGISTERED_MESSAGE = 'An account with this email already exists. Please sign in instead.';

interface TouchedState {
  firstName?: boolean;
  lastName?: boolean;
  email?: boolean;
  password?: boolean;
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<TouchedState>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && emailValid && passwordValid && agreed;

  const firstNameError = touched.firstName && firstName.trim().length === 0 ? 'First name is required.' : undefined;
  const lastNameError = touched.lastName && lastName.trim().length === 0 ? 'Last name is required.' : undefined;
  const emailError = touched.email && email.length > 0 && !emailValid ? 'Enter a valid email address.' : undefined;
  const passwordError =
    touched.password && password.length > 0 && !passwordValid
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  function markTouched(field: keyof TouchedState) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true });
    if (!canSubmit || submitting) return;

    if (!supabase) {
      setError('Sign-up is not configured yet.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes('already registered')
          ? ALREADY_REGISTERED_MESSAGE
          : signUpError.message,
      );
      return;
    }

    // Supabase's anti-enumeration design: signUp() for an email that already
    // has a confirmed account returns a fake/obfuscated user rather than an
    // error, so it can't be told apart from a real signup by response shape
    // alone -- except its identities array is always empty, unlike a
    // genuinely new signup's. (The other documented mode returns an explicit
    // "already registered" error instead, handled above.)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError(ALREADY_REGISTERED_MESSAGE);
      return;
    }

    setSent(true);
  }

  async function onOAuthSignIn(provider: 'google' | 'apple') {
    if (!supabase) {
      setError('Sign-up is not configured yet.');
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <>
      <Seo title="Sign Up" path="/register" noindex />
      <AuthLayout
        title="Join AIIT."
        intro="Create your AIIT account to enrol in courses, earn certificates and follow the AIIT Blueprint."
        social={
          sent ? undefined : (
            <>
              <GoogleAuthButton onClick={() => onOAuthSignIn('google')} />
              <AppleAuthButton onClick={() => onOAuthSignIn('apple')} />
            </>
          )
        }
        footer={
          <>
            Have account? <Link to="/login">Sign In</Link>
          </>
        }
      >
        {sent ? (
          <p className="auth__done">
            Check your inbox to confirm your email address, then sign in to get started.
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
            <div className="auth__row">
              <TextField
                label="First name"
                name="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => markTouched('firstName')}
                error={firstNameError}
              />
              <TextField
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => markTouched('lastName')}
                error={lastNameError}
              />
            </div>
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched('email')}
              error={emailError}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched('password')}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              error={passwordError}
            />
            <PasswordStrengthMeter password={password} />
            <label className="auth__check">
              <input
                type="checkbox"
                name="terms"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the <Link to="/terms">Terms and Conditions</Link> and{' '}
                <Link to="/privacy-policy">Privacy Policy</Link>
              </span>
            </label>
            <Button as="button" type="submit" size="lg" fullWidth arrow disabled={!canSubmit} loading={submitting}>
              Sign Up
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
