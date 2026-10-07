import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { CreatePayPalOrderRequest, CreatePayPalOrderResponse } from '@aiit/shared';

interface PayPalButtonsActions {
  render: (container: HTMLElement) => void;
}

interface PayPalSdk {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsActions;
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

// Module-level, not per-mount -- several PayPalCheckoutButton instances
// (or remounts of the same one) must never inject the SDK <script> twice.
let sdkPromise: Promise<void> | null = null;

function loadPayPalSdk(clientId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the PayPal checkout SDK.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface PayPalCheckoutButtonProps {
  courseSlug: string;
  /** Called once a payment is captured and the learner is enrolled -- the caller owns navigation/cache invalidation, same as the free-enroll path. */
  onSuccess: () => void;
}

/**
 * Renders PayPal's own Smart Buttons once the SDK has loaded. The order
 * itself is created and captured server-side (PaymentsService) -- this
 * component never computes or sends an amount, it only relays the course
 * slug and the PayPal order id the backend hands back.
 */
export function PayPalCheckoutButton({ courseSlug, onSuccess }: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;

    loadPayPalSdk(clientId)
      .then(() => {
        if (cancelled || !containerRef.current || !window.paypal) return;
        window.paypal
          .Buttons({
            createOrder: async () => {
              setError(undefined);
              const body: CreatePayPalOrderRequest = { courseSlug };
              const res = await apiFetch<CreatePayPalOrderResponse>('/payments/paypal/orders', {
                method: 'POST',
                body: JSON.stringify(body),
              });
              return res.paypalOrderId;
            },
            onApprove: async (data) => {
              await apiFetch(`/payments/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method: 'POST' });
              onSuccess();
            },
            onError: (err) => {
              setError(err instanceof ApiError ? err.message : 'Something went wrong with PayPal checkout. Please try again.');
            },
          })
          .render(containerRef.current);
      })
      .catch(() => setError('Could not load PayPal checkout. Please try again later.'));

    return () => {
      cancelled = true;
    };
  }, [clientId, courseSlug, onSuccess]);

  if (!clientId) {
    return (
      <p className="course-detail__note">
        Online payment isn&apos;t available yet for this course -- use &quot;Ask about this course&quot; below.
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <div ref={containerRef} />
    </>
  );
}
