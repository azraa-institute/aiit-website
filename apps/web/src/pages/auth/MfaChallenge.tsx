import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TextField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';

interface MfaChallengeProps {
  onVerified: () => void;
}

/**
 * Shown after a successful password, magic-link, or Google sign-in when
 * the account has a verified authenticator factor enrolled (see
 * SecurityFactorsSection) -- Supabase issues a fully usable session
 * immediately regardless of MFA enrollment (checking
 * supabase.auth.mfa.getAuthenticatorAssuranceLevel() to decide whether a
 * second factor is still owed is the app's own job, not something
 * Supabase blocks automatically), so without a step like this the second
 * factor would be enrolled but never actually asked for at sign-in.
 */
export function MfaChallenge({ onVerified }: MfaChallengeProps) {
  const [factorId, setFactorId] = useState<string>();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (!alive) return;
      if (listError) {
        setError(listError.message);
        return;
      }
      const verified = data.totp.find((f) => f.status === 'verified');
      if (!verified) {
        // Caller only renders this when the session's own AAL says a
        // second factor is still owed -- if listFactors somehow disagrees,
        // fail open rather than lock a real user out over an inconsistency.
        onVerified();
        return;
      }
      setFactorId(verified.id);
    });
    return () => {
      alive = false;
    };
  }, [onVerified]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !factorId) return;
    setError(undefined);
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    onVerified();
  }

  return (
    <form className="auth__form" onSubmit={onSubmit} noValidate>
      {error && (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      )}
      <p>Enter the 6-digit code from your authenticator app.</p>
      <TextField
        label="Authenticator code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus
      />
      <Button
        as="button"
        type="submit"
        size="lg"
        fullWidth
        arrow
        disabled={!factorId || code.length !== 6}
        loading={verifying}
      >
        Verify
      </Button>
    </form>
  );
}
