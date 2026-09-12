import { cn } from '@/lib/cn';
import './password-strength-meter.css';

export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong';

/**
 * A simple length + character-variety heuristic -- not a proper entropy
 * estimate (that's what zxcvbn is for), but zxcvbn's dictionary adds
 * 400KB+ to ship a Weak/Fair/Strong hint for an informational-only meter.
 * Good enough for guidance; the actual requirement stays the 8-character
 * minimum enforced elsewhere.
 */
export function passwordStrength(password: string): { level: PasswordStrengthLevel; score: number } | null {
  if (password.length === 0) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level: PasswordStrengthLevel = score <= 2 ? 'weak' : score <= 4 ? 'fair' : 'strong';
  return { level, score };
}

const LABEL: Record<PasswordStrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
};

const FILLED_SEGMENTS: Record<PasswordStrengthLevel, number> = {
  weak: 1,
  fair: 2,
  strong: 3,
};

/** Informational only -- never gates submission. Renders nothing until the user has typed something. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const result = passwordStrength(password);
  if (!result) return null;

  const filled = FILLED_SEGMENTS[result.level];

  return (
    <div className="password-strength">
      <div className="password-strength__bars" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('password-strength__bar', i <= filled && `password-strength__bar--${result.level}`)}
          />
        ))}
      </div>
      <span
        className={cn('password-strength__label', `password-strength__label--${result.level}`)}
        aria-live="polite"
      >
        {LABEL[result.level]}
      </span>
    </div>
  );
}
