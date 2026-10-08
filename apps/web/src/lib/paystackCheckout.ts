import { apiFetch, ApiError } from '@/lib/api';
import { captureException } from '@/lib/sentry';
import type { CreatePaystackOrderRequest, CreatePaystackOrderResponse } from '@aiit/shared';

interface PaystackTransaction {
  reference: string;
  status: string;
}

interface PaystackPopInstance {
  checkout: (options: {
    accessCode: string;
    onSuccess: (transaction: PaystackTransaction) => void;
    onCancel: () => void;
  }) => void;
}

interface PaystackPopSdk {
  new (): PaystackPopInstance;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPopSdk;
  }
}

// Module-level, not per-call -- several triggers across the page must never
// inject the Inline <script> twice. Same pattern as
// lib/razorpayCheckout.ts's loadRazorpaySdk(), kept as its own copy for the
// same reason (each third-party SDK owns its own loader -- see
// Turnstile.tsx/PayPalCheckoutButton.tsx).
let sdkPromise: Promise<void> | null = null;

function loadPaystackSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Paystack checkout SDK.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface OpenPaystackCheckoutOptions {
  courseSlug: string;
  /**
   * Not sent to Paystack's API or SDK -- Inline v2 deliberately doesn't
   * accept a key from the client at all (see below). Validated here
   * instead, so this function (not just the caller) fails closed if
   * Paystack genuinely isn't configured. Also keeps this value a real,
   * content-dependent runtime check rather than a bare presence flag --
   * a string only ever used for `if (x)` is exactly the kind of thing a
   * minifier can prove is safe to discard and keep just `true`, which is
   * what silently stripped VITE_PAYSTACK_PUBLIC_KEY out of the bundle
   * entirely in an earlier version of this integration (it was only
   * ever truthiness-checked, never read) -- using the actual value here
   * is what prevents that regression, not merely referencing it.
   */
  publicKey: string;
  /** Called once a payment is verified and the learner is enrolled -- the caller owns navigation/cache invalidation, same as the other two providers. */
  onSuccess: () => void;
  onError: (message: string) => void;
  /** The popup closed (paid or not) -- callers use this to reset a "loading" state. */
  onDismiss?: () => void;
}

/**
 * Initializes a transaction server-side (amount is resolved and locked in
 * by PaymentsService -- never trusted from the client), then opens
 * Paystack's Inline v2 popup for that exact access_code. Inline v2
 * deliberately doesn't accept key/amount/ref from the client at all -- the
 * whole point of the access-code handoff is that the popup can't be used
 * to pay a different amount than what the server initialized.
 */
export async function openPaystackCheckout({ courseSlug, publicKey, onSuccess, onError, onDismiss }: OpenPaystackCheckoutOptions): Promise<void> {
  try {
    if (!publicKey.startsWith('pk_')) {
      onError('Payments are not configured yet.');
      onDismiss?.();
      return;
    }
    await loadPaystackSdk();
    if (!window.PaystackPop) throw new Error('Paystack SDK failed to load.');

    const body: CreatePaystackOrderRequest = { courseSlug };
    const order = await apiFetch<CreatePaystackOrderResponse>('/payments/paystack/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const popup = new window.PaystackPop();
    popup.checkout({
      accessCode: order.accessCode,
      onSuccess: (transaction) => {
        apiFetch(`/payments/paystack/orders/${encodeURIComponent(transaction.reference)}/verify`, { method: 'POST' })
          .then(() => onSuccess())
          .catch((err: unknown) => {
            captureException(err);
            onError(err instanceof ApiError ? err.message : 'Something went wrong confirming your payment. Please try again.');
          })
          .finally(() => onDismiss?.());
      },
      onCancel: () => {
        onDismiss?.();
      },
    });
  } catch (err) {
    captureException(err);
    onError(err instanceof ApiError ? err.message : 'Could not start Paystack checkout. Please try again later.');
    onDismiss?.();
  }
}
