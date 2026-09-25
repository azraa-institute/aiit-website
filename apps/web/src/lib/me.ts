import { useCallback, useEffect, useState } from 'react';
import type { Me, UserRole } from '@aiit/shared';
import { apiFetch } from './api';
import { useAuth } from './AuthContext';

/**
 * The signed-in user's own record (GET /auth/me) -- the role and
 * must-change-password flag that route guards decide on. Deliberately
 * separate from the learner portal's data layer, which also loads
 * enrollments/assignments/etc. and makes no sense for staff.
 * Cached per user id so guards on nested routes share one request.
 */
export type MeState =
  | { status: 'loading' }
  | { status: 'ready'; me: Me }
  | { status: 'error'; error: Error };

let cache: { userId: string; promise: Promise<Me> } | null = null;

function loadMe(userId: string): Promise<Me> {
  if (!cache || cache.userId !== userId) {
    const promise = apiFetch<Me>('/auth/me');
    // A failed load must not be remembered, or a Retry would return the same failure.
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
    cache = { userId, promise };
  }
  return cache.promise;
}

export function invalidateMe(): void {
  cache = null;
}

export function useMe(): MeState & { refetch: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<MeState>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadMe(userId)
      .then((me) => alive && setState({ status: 'ready', me }))
      .catch((error: unknown) =>
        alive && setState({ status: 'error', error: error instanceof Error ? error : new Error('Could not load your account.') }),
      );
    return () => {
      alive = false;
    };
  }, [userId, tick]);

  const refetch = useCallback(() => {
    invalidateMe();
    setState({ status: 'loading' });
    setTick((n) => n + 1);
  }, []);

  return { ...state, refetch };
}

/** Where each role lives. Students: /portal, instructors: /instructor, admins: /admin. */
export function roleHome(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'instructor') return '/instructor';
  return '/portal';
}
