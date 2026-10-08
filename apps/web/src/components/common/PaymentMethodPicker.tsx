import { useState } from 'react';
import { PayPalCheckoutButton } from '@/components/common/PayPalCheckoutButton';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';
import './payment-method-picker.css';

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 14.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface PaymentMethodPickerProps {
  courseSlug: string;
  /** Called once a payment is confirmed and the learner is enrolled. */
  onSuccess: () => void;
}

/**
 * The "choose a payment method" picker -- three cards, each hosting a real
 * payment trigger. PayPal's two cards each host one of PayPal's own hosted
 * buttons (isolated by funding source -- see PayPalCheckoutButton), which
 * can't be disguised as a plain icon per PayPal's branding terms and the
 * platform's own security model (a custom element can never trigger a
 * PayPal payment on its own). Razorpay's card is a real circle button we
 * trigger ourselves, since we own that integration end to end.
 */
export function PaymentMethodPicker({ courseSlug, onSuccess }: PaymentMethodPickerProps) {
  const [error, setError] = useState<string>();
  const [cardEligible, setCardEligible] = useState(true);
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

  function handleRazorpayClick() {
    if (!razorpayKeyId) return;
    setError(undefined);
    setRazorpayLoading(true);
    void openRazorpayCheckout({
      courseSlug,
      keyId: razorpayKeyId,
      onSuccess,
      onError: setError,
      onDismiss: () => setRazorpayLoading(false),
    });
  }

  return (
    <div className="pm-picker">
      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="pm-grid">
        {paypalClientId ? (
          <div className="pm-card pm-card--paypal">
            <span className="pm-card__badge pm-card__badge--paypal" aria-hidden="true">
              P
            </span>
            <h3 className="pm-card__title">PayPal</h3>
            <p className="pm-card__desc">Pay with your PayPal balance, card, or bank</p>
            <div className="pm-card__action">
              <PayPalCheckoutButton courseSlug={courseSlug} fundingSource="paypal" onSuccess={onSuccess} onError={setError} />
            </div>
          </div>
        ) : null}

        {paypalClientId && cardEligible ? (
          <div className="pm-card pm-card--card">
            <span className="pm-card__badge pm-card__badge--card" aria-hidden="true">
              <CardIcon />
            </span>
            <h3 className="pm-card__title">Debit or Credit Card</h3>
            <p className="pm-card__desc">Pay securely with your card</p>
            <div className="pm-card__action">
              <PayPalCheckoutButton
                courseSlug={courseSlug}
                fundingSource="card"
                onSuccess={onSuccess}
                onError={setError}
                onEligibility={setCardEligible}
              />
            </div>
          </div>
        ) : null}

        {razorpayKeyId ? (
          <div className="pm-card pm-card--razorpay">
            <span className="pm-card__badge pm-card__badge--razorpay" aria-hidden="true">
              R
            </span>
            <h3 className="pm-card__title">Razorpay</h3>
            <p className="pm-card__desc">Pay using UPI, cards, netbanking, or wallets</p>
            <div className="pm-card__action">
              <button type="button" className="pm-card__circle" onClick={handleRazorpayClick} disabled={razorpayLoading} aria-label="Pay with Razorpay">
                <ArrowIcon />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
