import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { TextField } from '@/components/common/Field';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
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
          <form className="auth__form" onSubmit={onSubmit}>
            <TextField label="Email" name="email" type="email" autoComplete="email" required />
            <Button as="button" type="submit" size="lg" fullWidth arrow>
              Send reset link
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
