import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useLearner } from '@/pages/portal/learnerData';

/**
 * Gates the /admin area on the API-reported role. This is a UX guard only --
 * every /admin endpoint enforces @Roles('admin') on the server, so a
 * non-admin who bypassed this would just get 403s and no data.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const state = useLearner();
  if (state.status === 'loading') return <RouteFallback />;
  if (state.status === 'error' || state.learner.role !== 'admin') return <Navigate to="/portal" replace />;
  return <>{children}</>;
}
