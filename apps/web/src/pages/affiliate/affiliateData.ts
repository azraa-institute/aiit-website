import { useCallback, useEffect, useState } from 'react';
import type { AffiliateMe } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

/**
 * The signed-in user's own affiliate application/status (GET
 * /affiliates/me) -- same shape and caching convention as lib/me.ts's
 * useMe(), kept separate since affiliate-ness isn't part of Me (it's
 * deliberately not a Profile.role, see the schema.prisma comment on the
 * Affiliate model).
 */
export type AffiliateMeState =
  | { status: 'loading' }
  | { status: 'ready'; data: AffiliateMe }
  | { status: 'error'; error: Error };

let cache: { userId: string; promise: Promise<AffiliateMe> } | null = null;

function load(userId: string): Promise<AffiliateMe> {
  if (!cache || cache.userId !== userId) {
    const promise = apiFetch<AffiliateMe>('/affiliates/me');
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
    cache = { userId, promise };
  }
  return cache.promise;
}

export function invalidateAffiliateMe(): void {
  cache = null;
}

export function useAffiliateMe(): AffiliateMeState & { refetch: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<AffiliateMeState>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    load(userId)
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((error: unknown) =>
        alive && setState({ status: 'error', error: error instanceof Error ? error : new Error('Could not load your affiliate status.') }),
      );
    return () => {
      alive = false;
    };
  }, [userId, tick]);

  const refetch = useCallback(() => {
    invalidateAffiliateMe();
    setState({ status: 'loading' });
    setTick((n) => n + 1);
  }, []);

  return { ...state, refetch };
}
