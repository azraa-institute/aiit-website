import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@aiit/shared';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { roleHome, useMe } from '@/lib/me';

/**
 * Keeps the three portals apart: each route tree admits only its own role and
 * sends everyone else to their own home (a student who opens /admin lands in
 * /portal, an admin who opens /portal lands in /admin). A staff account still
 * on its temporary password is held at the change-password screen first.
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
  if (me.role !== 'learner' && me.mustChangePassword && !allowMustChangePassword) {
    return <Navigate to="/staff/change-password" replace />;
  }
  return <>{children}</>;
}
