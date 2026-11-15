import { useEffect, useState } from 'react';
import type { CartItemSummary } from '@aiit/shared';
import { apiFetch } from '@/lib/api';

let inFlight: Promise<CartItemSummary[]> | null = null;

function loadCart(): Promise<CartItemSummary[]> {
  if (!inFlight) inFlight = apiFetch<CartItemSummary[]>('/me/cart');
  return inFlight;
}

/** Every mounted useCart() instance registers here, same broadcast pattern as learnerData.ts's invalidateLearner -- so the dashboard cart widget, a catalogue card's "in cart" state, and the course-detail page's toggle all stay in sync without prop drilling. */
const listeners = new Set<() => void>();

/** Call after any action that changes the cart server-side (add, remove, checkout). */
export function invalidateCart(): void {
  inFlight = null;
  listeners.forEach((notify) => notify());
}

export type CartState =
  | { status: 'loading'; items: null; error: null }
  | { status: 'ready'; items: CartItemSummary[]; error: null }
  | { status: 'error'; items: null; error: Error };

/** `enabled` (default true) lets a caller gate the fetch on its own auth check -- an anonymous visitor never has a cart. */
export function useCart(options?: { enabled?: boolean }): CartState & { reload: () => void } {
  const enabled = options?.enabled ?? true;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<CartState>({ status: 'loading', items: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    const notify = () => setReloadToken((t) => t + 1);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadCart()
      .then((items) => {
        if (alive) setState({ status: 'ready', items, error: null });
      })
      .catch((error: unknown) => {
        if (alive) setState({ status: 'error', items: null, error: error instanceof Error ? error : new Error('Could not load your cart.') });
      });
    return () => {
      alive = false;
    };
  }, [enabled, reloadToken]);

  return { ...state, reload: invalidateCart };
}

export async function addToCart(courseSlug: string): Promise<void> {
  await apiFetch('/me/cart', { method: 'POST', body: JSON.stringify({ courseSlug }) });
  invalidateCart();
}

export async function removeFromCart(courseId: string): Promise<void> {
  await apiFetch(`/me/cart/${encodeURIComponent(courseId)}`, { method: 'DELETE' });
  invalidateCart();
}
