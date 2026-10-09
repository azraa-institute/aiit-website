import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@aiit/shared';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { roleHome, useMe } from '@/lib/me';

/**
 * Keeps the three portals apart: each route tree admits only its own role and
 * sends everyone else to their own home (a student who opens /admin lands in
 * /portal, an admin who opens /portal lands in /admin). Any account still on
 * a temporary password (a staff account an admin created, or a learner
 * account an affiliate application created via AffiliatesService.applyNew())
 * is held at a change-password screen first -- staff go to
 * /staff/change-password, a learner to /change-password.
 *
 * This is the UX layer only -- every API endpoint enforces the role itself.
 */
export function RequireRole({
  allow,
  children,
  allowMustChangePassword = false,
}: {
  allow: UserRole[];
  children: ReactNode;
  allowMustChangePassword?: boolean;
}) {
  const state = useMe();

  if (state.status === 'loading') return <RouteFallback />;

  if (state.status === 'error') {
    return (
      <div className="section container" role="alert" style={{ textAlign: 'center' }}>
        <p className="heading">We couldn&apos;t load your account.</p>
        <p>{state.error.message}</p>
        <button type="button" className="btn btn--secondary" onClick={state.refetch}>
          Try again
        </button>
      </div>
    );
  }

  const { me } = state;
  if (!allow.includes(me.role)) return <Navigate to={roleHome(me.role)} replace />;
  if (me.mustChangePassword && !allowMustChangePassword) {
    return <Navigate to={me.role === 'learner' ? '/change-password' : '/staff/change-password'} replace />;
  }
  return <>{children}</>;
}
