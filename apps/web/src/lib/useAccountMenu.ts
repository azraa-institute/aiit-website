import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getPortalReturn } from './portalReturn';
import { publicFileUrl } from './storage';
import { useLearner } from '@/pages/portal/learnerData';

/**
 * Shared data behind the public header's account control (desktop dropdown
 * in HeaderAccount.tsx, the equivalent block in MobileMenu.tsx): whether
 * there's a session, the learner's real name/avatar photo -- via the same
 * shared, cached useLearner() the portal topbar itself reads, not the
 * session's own OAuth metadata (a Google sign-in's account photo isn't the
 * uploaded profile photo, and looked visibly different: a different image
 * in a different circular treatment). useLearner({ enabled }) only fetches
 * once actually authenticated, so a signed-out visitor never fires it, and
 * reuses the portal's request if it's already cached this session -- an
 * avatar upload on ProfilePage updates this the same instant it updates
 * the portal topbar, via that hook's existing refetch broadcast.
 */
export function useAccountMenu() {
  const { status, session, signOut } = useAuth();
  const location = useLocation();
  const [returnTo, setReturnTo] = useState<'resources' | null>(null);

  useEffect(() => {
    setReturnTo(getPortalReturn());
  }, [location.pathname]);

  const authenticated = status === 'authenticated' && !!session;
  const learnerState = useLearner({ enabled: authenticated });
  const profile = learnerState.status === 'ready' ? learnerState.learner.profile : null;

  const name = profile?.name ?? session?.user.email ?? null;
  const photoUrl = publicFileUrl('avatars', profile?.avatarKey ?? null);

  return {
    authenticated,
    name,
    photoUrl,
    returnTarget: returnTo === 'resources' ? '/portal/resources' : '/portal',
    returnLabel: returnTo === 'resources' ? 'Return to Resources' : 'Return to Dashboard',
    signOut,
  };
}
