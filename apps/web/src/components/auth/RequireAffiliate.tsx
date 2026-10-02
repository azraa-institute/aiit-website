import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useAffiliateMe } from '@/pages/affiliate/affiliateData';

/**
 * Gates the affiliate portal on "has an application at all" -- not on
 * approval status, since the whole point is a pending applicant can see
 * their own status here (the dashboard itself branches on
 * applicationStatus). Mirrors RequireRole.tsx's shape, but checks
 * /affiliates/me rather than Profile.role (affiliate-ness deliberately
 * isn't a role -- see the schema.prisma comment on the Affiliate model).
 */
export function RequireAffiliate({ children }: { children: ReactNode }) {
  const state = useAffiliateMe();

  if (state.status === 'loading') return <RouteFallback />;

  if (state.status === 'error') {
    return (
      <div className="section container" role="alert" style={{ textAlign: 'center' }}>
        <p className="heading">We couldn&apos;t load your affiliate status.</p>
        <p>{state.error.message}</p>
        <button type="button" className="btn btn--secondary" onClick={state.refetch}>
          Try again
        </button>
      </div>
    );
  }

  if (!state.data.hasApplied) return <Navigate to="/affiliate" replace />;
  return <>{children}</>;
}
