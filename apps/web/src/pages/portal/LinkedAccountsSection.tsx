import { useEffect, useState } from 'react';
import type { UserIdentity } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/primitives/Button';

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email & password',
  google: 'Google',
};

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/**
 * Only shown at all when the account actually has a Google identity linked --
 * nothing to manage here for an email/password-only account. Unlinking is
 * blocked client-side (and by Supabase itself) unless the account has a
 * second identity to fall back on, same "don't lock yourself out" guarantee
 * as removing the last verified 2FA factor.
 */
export function LinkedAccountsSection() {
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [unlinkingId, setUnlinkingId] = useState<string>();

  useEffect(() => {
    void loadIdentities();
  }, []);

  async function loadIdentities() {
    if (!supabase) {
      setLoadError('Not configured yet.');
      return;
    }
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      setLoadError(error.message);
      return;
    }
    setIdentities(data.identities);
  }

  async function handleUnlink(identity: UserIdentity) {
    if (!supabase) return;
    setActionError(undefined);
    setActionMessage(undefined);
    setUnlinkingId(identity.identity_id);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setUnlinkingId(undefined);
    if (error) {
      setActionError(error.message);
      return;
    }
    // Supabase's own native "Sign-in method removed" security notification
    // (Dashboard -> Authentication -> Emails -> Security) handles telling
    // the user about this now -- no app-level call needed.
    setActionMessage('Google account unlinked. You can still sign in with your email and password.');
    await loadIdentities();
  }

  if (loadError) {
    return (
      <section className="settings-section" data-reveal>
        <h2 className="settings-section__title">Linked sign-in methods</h2>
        <p className="auth__alert" role="alert">
          {loadError}
        </p>
      </section>
    );
  }

  if (identities === null) return null;

  const googleIdentity = identities.find((i) => i.provider === 'google');
  if (!googleIdentity) return null;

  const canUnlink = identities.length > 1;

  return (
    <section className="settings-section" data-reveal>
      <h2 className="settings-section__title">Linked sign-in methods</h2>
      <p className="settings__body">These are the ways you can currently sign in to your AIIT account.</p>

      {actionError ? (
        <p className="auth__alert" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionMessage ? <p className="profile-edit__saved">{actionMessage}</p> : null}

      <ul className="settings-section__factor-list">
        {identities.map((identity) => (
          <li key={identity.identity_id} className="settings-section__factor">
            <span>{providerLabel(identity.provider)}</span>
            {identity.provider === 'google' ? (
              <Button
                as="button"
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canUnlink}
                loading={unlinkingId === identity.identity_id}
                onClick={() => handleUnlink(identity)}
              >
                Unlink
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {!canUnlink ? (
        <p className="settings__body">
          Set a password above under &ldquo;Change password&rdquo; so you have another way to sign in, then you can
          unlink Google.
        </p>
      ) : null}
    </section>
  );
}
