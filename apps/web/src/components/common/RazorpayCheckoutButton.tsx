import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { captureException } from '@/lib/sentry';
import type { CreateRazorpayOrderRequest, CreateRazorpayOrderResponse, VerifyRazorpayPaymentRequest } from '@aiit/shared';
import './razorpay-checkout-button.css';

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

function RupeeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 19.5 6.5V11.5C19.5 16 16.3 19.8 12 21C7.7 19.8 4.5 16 4.5 11.5V6.5L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.75 12 11 14.25 15.25 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Module-level, not per-mount -- several instances/remounts must never
// inject the Checkout.js <script> twice. Same pattern as
// PayPalCheckoutButton's loadPayPalSdk(), kept as its own copy rather than
// a shared helper -- see that component's own loader for why.
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

interface RazorpayCheckoutButtonProps {
  courseSlug: string;
  /** Called once a payment is verified and the learner is enrolled -- the caller owns navigation/cache invalidation, same as PayPalCheckoutButton. */
  onSuccess: () => void;
}

/**
 * Unlike PayPal (a hosted button we only frame), Razorpay's Checkout.js is
 * a modal *we* trigger -- this button's click handler creates the order,
 * then opens the modal itself. The order itself is created and verified
 * server-side (PaymentsService) -- this component never computes or sends
 * an amount, it only relays the course slug and the payment id/signature
 * Checkout.js hands back.
 */
export function RazorpayCheckoutButton({ courseSlug, onSuccess }: RazorpayCheckoutButtonProps) {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

  if (!keyId) return null;

  async function handleClick() {
    setError(undefined);
    setLoading(true);
    try {
      await loadRazorpaySdk();
      if (!window.Razorpay) throw new Error('Razorpay SDK failed to load.');

      const body: CreateRazorpayOrderRequest = { courseSlug };
      const order = await apiFetch<CreateRazorpayOrderResponse>('/payments/razorpay/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const rzp = new window.Razorpay({
        key: keyId as string,
        amount: order.amountCents,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: 'AIIT.NETWORK',
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
              setError(err instanceof ApiError ? err.message : 'Something went wrong confirming your payment. Please try again.');
            });
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description ?? 'Your payment could not be completed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      captureException(err);
      setError(err instanceof ApiError ? err.message : 'Could not start Razorpay checkout. Please try again later.');
      setLoading(false);
    }
  }

  return (
    <div className="rzp-checkout">
      <div className="rzp-method">
        <span className="rzp-method__badge" aria-hidden="true">
          R
        </span>
        <span className="rzp-method__text">
          <span className="rzp-method__name">Razorpay</span>
          <span className="rzp-method__sub">UPI, cards, netbanking, wallets</span>
        </span>
      </div>
      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="rzp-checkout__trigger" onClick={handleClick} disabled={loading}>
        {loading ? 'Opening Razorpay...' : 'Pay with Razorpay'}
      </button>
      <p className="rzp-checkout__footer">
        <RupeeIcon /> Payment processed securely by Razorpay
      </p>
    </div>
  );
}
