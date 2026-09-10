import { useState } from 'react';
import type { FormEvent } from 'react';
import { cn } from '@/lib/cn';
import './newsletter-form.css';

interface NewsletterFormProps {
  variant?: 'inline' | 'stacked';
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({ variant = 'inline', className }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setState('error');
      return;
    }
    // Wire to the AIIT audience API / CRM here.
    setState('done');
  }

  if (state === 'done') {
    return (
      <p className={cn('newsletter-form__done', className)}>
        You&apos;re on the list. Look out for AIIT updates, insights and upcoming webinars.
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
        <button type="submit">Subscribe</button>
      </div>
      {state === 'error' && (
        <p className="newsletter-form__error" role="alert">
          Please enter a valid email address.
        </p>
      )}
    </form>
  );
}
