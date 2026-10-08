import { useEffect, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { captureException } from '@/lib/sentry';
import type { CreatePayPalOrderRequest, CreatePayPalOrderResponse } from '@aiit/shared';

interface PayPalButtonsActions {
  isEligible: () => boolean;
  render: (container: HTMLElement) => void;
}

type PayPalFundingSource = 'paypal' | 'card';

interface PayPalSdk {
  FUNDING: { PAYPAL: 'paypal'; CARD: 'card' };
  Buttons: (options: {
    fundingSource?: PayPalFundingSource;
    style?: { layout?: 'vertical' | 'horizontal'; color?: 'gold' | 'blue' | 'silver' | 'black'; shape?: 'pill' | 'rect'; label?: 'paypal' | 'pay'; height?: number };
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
  /** Which of PayPal's own funding sources this instance renders -- 'paypal' for the PayPal-balance/login button, 'card' for PayPal's own card-only button. Each needs its own container, isolated via the SDK's `fundingSource` option, so the two can live in two separate cards instead of PayPal's default single auto-split button. */
  fundingSource: PayPalFundingSource;
  /** Called once a payment is captured and the learner is enrolled -- the caller owns navigation/cache invalidation, same as the free-enroll path. */
  onSuccess: () => void;
  /** Surfaced once by the caller (e.g. one shared banner above several payment-method cards) rather than rendered inline here. */
  onError?: (message: string) => void;
  /** PayPal's Card funding isn't always eligible for every buyer/region -- lets the caller hide the whole card rather than show an empty button slot. Called once eligibility is known. */
  onEligibility?: (eligible: boolean) => void;
}

/**
 * Renders exactly one of PayPal's own Smart Buttons (isolated to a single
 * funding source) once the SDK has loaded. The order itself is created and
 * captured server-side (PaymentsService) -- this component never computes
 * or sends an amount, it only relays the course slug and the PayPal order
 * id the backend hands back. No card chrome here (label/badge/footer) --
 * the caller (PaymentMethodPicker) owns the surrounding card.
 */
export function PayPalCheckoutButton({ courseSlug, fundingSource, onSuccess, onError, onEligibility }: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

  // Read via refs inside the effect below, not as dependencies -- these are
  // fresh inline functions on every render of the course page, and
  // depending on them directly re-ran the effect (re-rendering PayPal's
  // Buttons into the same container, which PayPal's SDK appends to rather
  // than replaces) on every unrelated re-render, producing duplicate
  // buttons and a confused internal SDK error.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onEligibilityRef = useRef(onEligibility);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onEligibilityRef.current = onEligibility;
  }, [onSuccess, onError, onEligibility]);

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    loadPayPalSdk(clientId)
      .then(() => {
        if (cancelled || !window.paypal) return;
        const buttons = window.paypal.Buttons({
          fundingSource,
          style: { layout: 'vertical', color: fundingSource === 'card' ? 'black' : 'gold', shape: 'pill', label: fundingSource === 'card' ? 'pay' : 'paypal', height: 40 },
          createOrder: async () => {
            const body: CreatePayPalOrderRequest = { courseSlug };
            const res = await apiFetch<CreatePayPalOrderResponse>('/payments/paypal/orders', {
              method: 'POST',
              body: JSON.stringify(body),
            });
            return res.paypalOrderId;
          },
          onApprove: async (data) => {
            await apiFetch(`/payments/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method: 'POST' });
            onSuccessRef.current();
          },
          onError: (err) => {
            captureException(err);
            onErrorRef.current?.(err instanceof ApiError ? err.message : 'Something went wrong with PayPal checkout. Please try again.');
          },
        });
        const eligible = buttons.isEligible();
        onEligibilityRef.current?.(eligible);
        if (!eligible) return;
        // Defensive: never render into a container that may already have
        // buttons in it (e.g. React StrictMode's double-invoke in dev).
        container.innerHTML = '';
        buttons.render(container);
      })
      .catch((err) => {
        captureException(err);
        onErrorRef.current?.('Could not load PayPal checkout. Please try again later.');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, courseSlug, fundingSource]);

  if (!clientId) return null;

  return <div ref={containerRef} />;
}
