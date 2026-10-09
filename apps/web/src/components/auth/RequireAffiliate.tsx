import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useAffiliateMe } from '@/pages/affiliate/affiliateData';
import { useMe } from '@/lib/me';

/**
 * Gates the affiliate portal on "has an application at all" -- not on
 * approval status, since the whole point is a pending applicant can see
 * their own status here (the dashboard itself branches on
 * applicationStatus). Mirrors RequireRole.tsx's shape, but checks
 * /affiliates/me rather than Profile.role (affiliate-ness deliberately
 * isn't a role -- see the schema.prisma comment on the Affiliate model).
 *
 * Doesn't go through RequireRole, so it needs its own mustChangePassword
 * check -- an affiliate account AffiliatesService.applyNew() created is
 * still on its one-time password the first time it ever lands here (e.g.
 * clicking straight into the dashboard link in that email).
 */
export function RequireAffiliate({ children }: { children: ReactNode }) {
  const me = useMe();
  const state = useAffiliateMe();

  if (me.status === 'loading' || state.status === 'loading') return <RouteFallback />;

  if (me.status === 'ready' && me.me.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

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
