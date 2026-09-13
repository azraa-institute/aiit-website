import { cn } from '@/lib/cn';
import './password-requirements.css';

export const MIN_PASSWORD_LENGTH = 8;

/** Kept in one place so every password-entry point states the exact same
 * requirement -- update here if the Supabase setting below ever changes. */
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, with a letter, a number and a symbol`;

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/** Mirrors the Supabase project's "Password requirements" setting (Auth ->
 * Providers -> Email): lowercase + uppercase letters, digits, and symbols,
 * min length 8. Keep in sync if that setting ever changes. Symbol set
 * matches Supabase's own allowed list (!@#$%^&*()_+-=[]{};'\:"|<>?,./`~). */
export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'A letter', met: /[a-zA-Z]/.test(password) },
    { label: 'A number', met: /\d/.test(password) },
    { label: 'A symbol', met: /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(password) },
  ];
}

export function passwordMeetsRequirements(password: string): boolean {
  return passwordRequirements(password).every((r) => r.met);
}

const CheckMark = ({ met }: { met: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="password-requirements__mark">
    {met ? (
      <path d="m2.2 6.2 2.4 2.4 5.2-5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <circle cx="6" cy="6" r="2" fill="currentColor" />
    )}
  </svg>
);

/**
 * Live checklist of what a password still needs, so a user finds out before
 * submitting rather than after a rejected signup/password-change. Renders
 * nothing until the user has started typing.
 */
export function PasswordRequirementsList({ password }: { password: string }) {
  if (password.length === 0) return null;
  return (
    <ul className="password-requirements" aria-live="polite">
      {passwordRequirements(password).map((r) => (
        <li key={r.label} className={cn('password-requirements__item', r.met && 'is-met')}>
          <CheckMark met={r.met} />
          {r.label}
        </li>
      ))}
    </ul>
  );
}
