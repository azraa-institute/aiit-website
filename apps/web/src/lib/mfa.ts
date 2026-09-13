import { supabase } from './supabaseClient';

/**
 * True when the just-established session is only AAL1 but the account has
 * a verified second factor requiring AAL2 -- i.e. the primary sign-in
 * (password, magic link, or Google) succeeded, but the account has 2FA
 * enrolled and Supabase hasn't verified it for this session yet. Supabase
 * issues a fully usable session at AAL1 regardless of MFA enrollment; it's
 * the app's job to check this and gate on it, not something enforced
 * automatically. See MfaChallenge for what happens when this is true.
 */
export async function needsMfaChallenge(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.nextLevel !== data.currentLevel;
}
