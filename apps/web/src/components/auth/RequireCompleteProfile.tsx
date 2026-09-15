import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useLearner } from '@/pages/portal/learnerData';

/**
 * Gates a portal content route behind a completed profile -- wraps only
 * `courses`, `certificates`, `assignments`, `resources`, `webinars` in
 * App.tsx's /portal route tree, NOT `index` (dashboard), `profile`,
 * `settings`, or `notifications`: the learner must always be able to reach
 * those to actually complete their profile, and the dashboard is where the
 * completion wizard/banner live (see PortalLayout.tsx).
 *
 * Sits inside RequireAuth (which already ran by the time PortalLayout's
 * children render), so `useLearner()` here always has a real session to
 * fetch against -- no separate anonymous-state handling needed.
 */
export function RequireCompleteProfile({ children }: { children: ReactNode }) {
  const state = useLearner();

  if (state.status === 'loading') {
    return <RouteFallback />;
  }

  if (state.status === 'ready' && !state.learner.profileComplete) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
}
