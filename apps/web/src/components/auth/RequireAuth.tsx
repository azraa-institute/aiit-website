import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { RouteFallback } from '@/components/layout/RouteFallback';

/**
 * Gates its children behind a Supabase session, preserving the target route
 * so the sign-in page can send the visitor back afterwards.
 *
 * `to` is the sign-in page to send an anonymous visitor to -- defaults to the
 * student one, but /admin and /instructor pass '/staff/login'. This matters
 * on sign-out specifically: StaffShell's own sign-out handler already
 * navigates to '/staff/login' itself, but supabase.auth.signOut() flips
 * AuthContext's status to 'anonymous' first, which re-renders this guard
 * immediately -- without a matching `to` here, that redirect used to win the
 * race and land a signing-out admin/instructor on the student login page
 * before StaffShell's own navigate() ever ran.
 */
export function RequireAuth({ children, to = '/login' }: { children: ReactNode; to?: string }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <RouteFallback />;
  }

  if (status === 'anonymous') {
    return <Navigate to={to} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
