import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField } from '@/components/common/Field';
import { startPortalSession } from '@/lib/session';
import { AuthLayout } from './AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get('email') || !data.get('password')) {
      setError('Enter your email and password.');
      return;
    }
    if (!/.+@.+\..+/.test(String(data.get('email')))) {
      setError('Enter a valid email address.');
      return;
    }
    setError(undefined);
    // Wire to the AIIT auth API here.
    startPortalSession();
    navigate('/portal');
  }

  return (
    <>
      <Seo title="Sign In" path="/login" noindex />
      <AuthLayout
        title="Welcome back"
        intro="Sign in to continue your courses, track progress and access your certificates."
        footer={
          <>
            No account? <Link to="/register">Sign Up</Link>
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
          <TextField label="Email" name="email" type="email" autoComplete="email" required />
          <PasswordField label="Password" name="password" autoComplete="current-password" required />
          <div className="auth__aux">
            <Link to="/forgot-password">Lost Password?</Link>
          </div>
          <Button as="button" type="submit" size="lg" fullWidth arrow>
            Sign In
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
