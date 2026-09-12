import { useState } from 'react';
import type { FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { apiFetch, ApiError } from '@/lib/api';
import { Turnstile } from './Turnstile';
import './newsletter-form.css';

interface NewsletterFormProps {
  variant?: 'inline' | 'stacked';
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({ variant = 'inline', className }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle');
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.');
      setState('error');
      return;
    }

    setState('submitting');
    try {
      await apiFetch('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email, turnstileToken }),
      });
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not subscribe you. Please try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className={cn('newsletter-form__done', className)}>
        Check your inbox to confirm your subscription to AIIT updates, insights and upcoming webinars.
      </p>
    );
  }

  return (
    <form
      className={cn('newsletter-form', `newsletter-form--${variant}`, className)}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="newsletter-form__field">
        <label htmlFor="newsletter-email" className="visually-hidden">
          Your email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          aria-invalid={state === 'error'}
        />
        <button type="submit" disabled={state === 'submitting' || !turnstileToken}>
          {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      <div className="newsletter-form__turnstile">
        <Turnstile onVerify={setTurnstileToken} />
      </div>
      {state === 'error' && (
        <p className="newsletter-form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
