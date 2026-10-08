import { apiFetch, ApiError } from '@/lib/api';
import { captureException } from '@/lib/sentry';
import type { CreateRazorpayOrderRequest, CreateRazorpayOrderResponse, VerifyRazorpayPaymentRequest } from '@aiit/shared';

interface RazorpayCheckoutHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

interface RazorpaySdk {
  new (options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description?: string;
    image?: string;
    theme?: { color?: string };
    handler: (response: RazorpayCheckoutHandlerResponse) => void;
    modal?: { ondismiss?: () => void };
  }): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpaySdk;
  }
}

// Module-level, not per-call -- several triggers across the page must never
// inject the Checkout.js <script> twice. Same pattern as
// PayPalCheckoutButton's loadPayPalSdk(), kept as its own copy rather than
// shared with it -- these are two unrelated third-party SDKs, each owning
// its own loader is this codebase's existing convention (see Turnstile.tsx).
let sdkPromise: Promise<void> | null = null;

function loadRazorpaySdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Razorpay checkout SDK.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface OpenRazorpayCheckoutOptions {
  courseSlug: string;
  keyId: string;
  /** Called once a payment is verified and the learner is enrolled -- the caller owns navigation/cache invalidation, same as PayPalCheckoutButton. */
  onSuccess: () => void;
  onError: (message: string) => void;
  /** The modal closed (paid or not) -- callers use this to reset a "loading" state. */
  onDismiss?: () => void;
}

/**
 * Creates a Razorpay order server-side, then opens Razorpay's own
 * Checkout.js modal (a modal *we* trigger, unlike PayPal's hosted button
 * which only we frame). The order itself is created and verified
 * server-side (PaymentsService) -- this never computes or sends an amount,
 * only relays the course slug and the payment id/signature Checkout.js
 * hands back. Shared by RazorpayCheckoutButton's default row and
 * PaymentMethodPicker's circle trigger, so the integration logic lives in
 * exactly one place.
 */
export async function openRazorpayCheckout({ courseSlug, keyId, onSuccess, onError, onDismiss }: OpenRazorpayCheckoutOptions): Promise<void> {
  try {
    await loadRazorpaySdk();
    if (!window.Razorpay) throw new Error('Razorpay SDK failed to load.');

    const body: CreateRazorpayOrderRequest = { courseSlug };
    const order = await apiFetch<CreateRazorpayOrderResponse>('/payments/razorpay/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amountCents,
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: 'AIIT.NETWORK',
      // Razorpay's checkout fetches this from its own hosted modal, not
      // our page -- needs an absolute URL, a relative path won't resolve.
      image: 'https://aiit.network/apple-touch-icon.png',
      theme: { color: '#2b2420' },
      handler: (response) => {
        const verifyBody: VerifyRazorpayPaymentRequest = {
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        };
        apiFetch(`/payments/razorpay/orders/${encodeURIComponent(response.razorpay_order_id)}/verify`, {
          method: 'POST',
          body: JSON.stringify(verifyBody),
        })
          .then(() => onSuccess())
          .catch((err: unknown) => {
            captureException(err);
            onError(err instanceof ApiError ? err.message : 'Something went wrong confirming your payment. Please try again.');
          });
      },
      modal: { ondismiss: () => onDismiss?.() },
    });
    rzp.on('payment.failed', (response) => {
      onError(response.error?.description ?? 'Your payment could not be completed. Please try again.');
      onDismiss?.();
    });
    rzp.open();
  } catch (err) {
    captureException(err);
    onError(err instanceof ApiError ? err.message : 'Could not start Razorpay checkout. Please try again later.');
    onDismiss?.();
  }
}
