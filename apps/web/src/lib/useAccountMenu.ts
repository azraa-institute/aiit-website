import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getPortalReturn } from './portalReturn';

/**
 * Shared data behind the public header's account control (desktop dropdown
 * in HeaderAccount.tsx, the equivalent block in MobileMenu.tsx): whether
 * there's a session, a display name/photo pulled from the session's own
 * metadata (no extra API call -- the portal's full learner profile fetch is
 * too heavy to run on every public page), and which portal section to
 * offer returning to.
 */
export function useAccountMenu() {
  const { status, session, signOut } = useAuth();
  const location = useLocation();
  const [returnTo, setReturnTo] = useState<'resources' | null>(null);

  useEffect(() => {
    setReturnTo(getPortalReturn());
  }, [location.pathname]);

  const authenticated = status === 'authenticated' && !!session;
  const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.full_name as string | undefined) || (meta.name as string | undefined) || session?.user.email || null;
  const photoUrl = (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || null;

  return {
    authenticated,
    name,
    photoUrl,
    returnTarget: returnTo === 'resources' ? '/portal/resources' : '/portal',
    returnLabel: returnTo === 'resources' ? 'Return to Resources' : 'Return to Dashboard',
    signOut,
  };
}
