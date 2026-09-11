import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { startPortalSession } from '@/lib/session';
import { AuthLayout } from './AuthLayout';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get('firstName') || !data.get('email') || !data.get('password')) {
      setError('Please complete the required fields.');
      return;
    }
    if (!/.+@.+\..+/.test(String(data.get('email')))) {
      setError('Enter a valid email address.');
      return;
    }
    if (String(data.get('password')).length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    if (!data.get('terms')) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setError(undefined);
    // Wire to the AIIT auth API here.
    startPortalSession();
    navigate('/portal');
  }

  return (
    <>
      <Seo title="Sign Up" path="/register" noindex />
      <AuthLayout
        title="Join AIIT."
        intro="Create your AIIT account to enrol in courses, earn certificates and follow the AIIT Blueprint."
        footer={
          <>
            Have account? <Link to="/login">Sign In</Link>
          </>
        }
      >
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
            <TextField label="First name" name="firstName" autoComplete="given-name" required />
            <TextField label="Last name" name="lastName" autoComplete="family-name" />
          </div>
          <TextField label="Email" name="email" type="email" autoComplete="email" required />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            required
          />
          <label className="auth__check">
            <input type="checkbox" name="terms" required />
            <span>
              I agree to the <Link to="/terms">Terms and Conditions</Link> and{' '}
              <Link to="/privacy-policy">Privacy Policy</Link>
            </span>
          </label>
          <Button as="button" type="submit" size="lg" fullWidth arrow>
            Sign Up
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
