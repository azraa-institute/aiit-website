import { useState } from 'react';
import { PayPalCheckoutButton } from '@/components/common/PayPalCheckoutButton';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';
import { openPaystackCheckout } from '@/lib/paystackCheckout';
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

// Real logo marks for the two round provider badges, sourced the same way
// as the card-network marks below (simple-icons, CC0-1.0, official path
// data + brand hex) rather than the plain letter placeholders this used to
// show. Paystack has no entry in simple-icons or any other open-licensed
// icon set I could find (and I'm not going to trace their trademarked mark
// freehand), so its badge stays a plain "Paystack" wordmark -- same
// no-guessing rule already applied to Verve/RuPay below.
const PAYPAL_MARK_PATH =
  'M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z';
const RAZORPAY_MARK_PATH =
  'M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z';

function PayPalMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d={PAYPAL_MARK_PATH} />
    </svg>
  );
}
function RazorpayMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d={RAZORPAY_MARK_PATH} />
    </svg>
  );
}

/**
 * Small "accepted payment methods" marks -- the same informational row
 * pattern PayPal/Stripe/every other checkout shows near their payment
 * button. Each brand's actual logo artwork (path data + official brand
 * colour), sourced from simple-icons (CC0-1.0 licensed SVG icon set,
 * https://github.com/simple-icons/simple-icons -- the standard open
 * source icon library sites use for exactly this "accepted here" use
 * case), not freehand-traced. `BrandChip` renders one inside the same
 * white rounded-rect frame used across every mark in this row.
 */
function BrandChip({ label, color, path }: { label: string; color: string; path: string }) {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" role="img" aria-label={label}>
      <rect width="34" height="22" rx="3" fill="#fff" stroke="var(--line)" />
      <svg x="8" y="3" width="18" height="16" viewBox="0 0 24 24">
        <path d={path} fill={color} />
      </svg>
    </svg>
  );
}
const VISA_PATH =
  'M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z';
const MASTERCARD_PATH =
  'M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z';
const GOOGLE_PAY_PATH =
  'M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z';
const PAYTM_PATH =
  'M15.85 8.167a.204.204 0 0 0-.04.004c-.68.19-.543 1.148-1.781 1.23h-.12a.23.23 0 0 0-.052.005h-.001a.24.24 0 0 0-.184.235v1.09c0 .134.106.241.237.241h.645v4.623c0 .132.104.238.233.238h1.058a.236.236 0 0 0 .233-.238v-4.623h.6c.13 0 .236-.107.236-.241v-1.09a.239.239 0 0 0-.236-.24h-.612V8.386a.218.218 0 0 0-.216-.22zm4.225 1.17c-.398 0-.762.15-1.042.395v-.124a.238.238 0 0 0-.234-.224h-1.07a.24.24 0 0 0-.236.242v5.92a.24.24 0 0 0 .236.242h1.07c.12 0 .217-.091.233-.209v-4.25a.393.393 0 0 1 .371-.408h.196a.41.41 0 0 1 .226.09.405.405 0 0 1 .145.319v4.074l.004.155a.24.24 0 0 0 .237.241h1.07a.239.239 0 0 0 .235-.23l-.001-4.246c0-.14.062-.266.174-.34a.419.419 0 0 1 .196-.068h.198c.23.02.37.2.37.408.005 1.396.004 2.8.004 4.224a.24.24 0 0 0 .237.241h1.07c.13 0 .236-.108.236-.241v-4.543c0-.31-.034-.442-.08-.577a1.601 1.601 0 0 0-1.51-1.09h-.015a1.58 1.58 0 0 0-1.152.5c-.291-.308-.7-.5-1.153-.5zM.232 9.4A.234.234 0 0 0 0 9.636v5.924c0 .132.096.238.216.241h1.09c.13 0 .237-.107.237-.24l.004-1.658H2.57c.857 0 1.453-.605 1.453-1.481v-1.538c0-.877-.596-1.484-1.453-1.484H.232zm9.032 0a.239.239 0 0 0-.237.241v2.47c0 .94.657 1.608 1.579 1.608h.675s.016 0 .037.004a.253.253 0 0 1 .222.253c0 .13-.096.235-.219.251l-.018.004-.303.006H9.739a.239.239 0 0 0-.236.24v1.09a.24.24 0 0 0 .236.242h1.75c.92 0 1.577-.669 1.577-1.608v-4.56a.239.239 0 0 0-.236-.24h-1.07a.239.239 0 0 0-.236.24c-.005.787 0 1.525 0 2.255a.253.253 0 0 1-.25.25h-.449a.253.253 0 0 1-.25-.255c.005-.754-.005-1.5-.005-2.25a.239.239 0 0 0-.236-.24zm-4.004.006a.232.232 0 0 0-.238.226v1.023c0 .132.113.24.252.24h1.413c.112.017.2.1.213.23v.14c-.013.124-.1.214-.207.224h-.7c-.93 0-1.594.63-1.594 1.515v1.269c0 .88.57 1.506 1.495 1.506h1.94c.348 0 .63-.27.63-.6v-4.136c0-1.004-.508-1.637-1.72-1.637zm-3.713 1.572h.678c.139 0 .25.115.25.256v.836a.253.253 0 0 1-.25.256h-.1c-.192.002-.386 0-.578 0zm4.67 1.977h.445c.139 0 .252.108.252.24v.932a.23.23 0 0 1-.014.076.25.25 0 0 1-.238.164h-.445a.247.247 0 0 1-.252-.24v-.933c0-.132.113-.239.252-.239Z';
const PHONEPE_PATH =
  'M10.206 9.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072 0-1.609-.536-1.609-1.743V9.941zm13.47 4.816c-1.523 6.449-7.985 10.442-14.433 8.919C2.794 22.154-1.199 15.691.324 9.243 1.847 2.794 8.309-1.199 14.757.324c6.449 1.523 10.442 7.985 8.919 14.433zm-6.231-5.888a.887.887 0 0 0-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021 3.82H6.386c-.201 0-.335.134-.335.335v.67c0 .469.402.871.871.871h.938v3.217c0 2.413 1.273 3.82 3.418 3.82.67 0 1.206-.067 1.877-.335v2.145c0 .603.469 1.072 1.072 1.072h.938a.432.432 0 0 0 .402-.402V9.874h1.542c.201 0 .335-.134.335-.335v-.67z';

function VisaMark() {
  return <BrandChip label="Visa" color="#1a1f71" path={VISA_PATH} />;
}
function MastercardMark() {
  return <BrandChip label="Mastercard" color="#eb001b" path={MASTERCARD_PATH} />;
}
function GooglePayMark() {
  return <BrandChip label="Google Pay" color="#4285f4" path={GOOGLE_PAY_PATH} />;
}
function PaytmMark() {
  return <BrandChip label="Paytm" color="#20336b" path={PAYTM_PATH} />;
}
function PhonePeMark() {
  return <BrandChip label="PhonePe" color="#5f259f" path={PHONEPE_PATH} />;
}
// Verve (Nigeria) and RuPay (India) have no artwork in simple-icons or any
// other open-licensed icon set I could find -- these two stay as simple
// brand-coloured wordmarks (not traced from official logo files) rather
// than guessing at artwork. Swap for the real mark if an official asset
// ever becomes available.
function VerveMark() {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" role="img" aria-label="Verve">
      <rect width="34" height="22" rx="3" fill="#fff" stroke="var(--line)" />
      <text x="17" y="14.5" textAnchor="middle" fontFamily="var(--font-ui)" fontWeight="700" fontSize="9" fill="#003e7e">
        verve
      </text>
    </svg>
  );
}
function RupayMark() {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" role="img" aria-label="RuPay">
      <rect width="34" height="22" rx="3" fill="#fff" stroke="var(--line)" />
      <text x="17" y="14.5" textAnchor="middle" fontFamily="var(--font-ui)" fontWeight="700" fontSize="8" fill="#0d4d9c">
        Ru<tspan fill="#ec7625">Pay</tspan>
      </text>
    </svg>
  );
}

interface PaymentMethodPickerProps {
  courseSlug: string;
  /** Called once a payment is confirmed and the learner is enrolled. */
  onSuccess: () => void;
}

/**
 * The "choose a payment method" picker -- up to four cards (count varies:
 * either env var can be unset, and PayPal's Card funding can be
 * ineligible), each hosting a real payment trigger. PayPal's two cards
 * each host one of PayPal's own hosted buttons (isolated by funding source
 * -- see PayPalCheckoutButton), which can't be disguised as a plain icon
 * per PayPal's branding terms and the platform's own security model (a
 * custom element can never trigger a PayPal payment on its own). Razorpay
 * and Paystack's cards are real circle buttons we trigger ourselves, since
 * we own those integrations end to end.
 */
export function PaymentMethodPicker({ courseSlug, onSuccess }: PaymentMethodPickerProps) {
  const [error, setError] = useState<string>();
  const [cardEligible, setCardEligible] = useState(true);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
  // Gates whether this card renders at all, same as the other two
  // providers' keys above -- also passed into openPaystackCheckout(),
  // which validates its actual content (not just presence). Keeping a
  // real downstream use matters: a value only ever truthiness-checked is
  // exactly what a minifier can prove is safe to discard down to `true`,
  // which is what silently stripped this key out of a production build
  // in an earlier version of this file.
  const paystackPublicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined) ?? '';

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

  function handlePaystackClick() {
    if (!paystackPublicKey) return;
    setError(undefined);
    setPaystackLoading(true);
    void openPaystackCheckout({
      courseSlug,
      publicKey: paystackPublicKey,
      onSuccess,
      onError: setError,
      onDismiss: () => setPaystackLoading(false),
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
              <PayPalMark />
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
              <RazorpayMark />
            </span>
            <h3 className="pm-card__title">Razorpay</h3>
            <p className="pm-card__desc">Pay using UPI, cards, netbanking, or wallets</p>
            <div className="pm-card__networks" aria-hidden="true">
              <GooglePayMark />
              <PhonePeMark />
              <PaytmMark />
              <VisaMark />
              <MastercardMark />
              <RupayMark />
            </div>
            <div className="pm-card__action">
              <button type="button" className="pm-card__circle pm-card__circle--razorpay" onClick={handleRazorpayClick} disabled={razorpayLoading} aria-label="Pay with Razorpay">
                <ArrowIcon />
              </button>
            </div>
          </div>
        ) : null}

        {paystackPublicKey ? (
          <div className="pm-card pm-card--paystack">
            <span className="pm-card__badge pm-card__badge--paystack pm-card__badge--wordmark" aria-hidden="true">
              Paystack
            </span>
            <h3 className="pm-card__title">Paystack</h3>
            <p className="pm-card__desc">Pay using card, bank transfer, or USSD</p>
            <div className="pm-card__networks" aria-hidden="true">
              <VisaMark />
              <MastercardMark />
              <VerveMark />
            </div>
            <div className="pm-card__action">
              <button
                type="button"
                className="pm-card__circle pm-card__circle--paystack"
                onClick={handlePaystackClick}
                disabled={paystackLoading}
                aria-label="Pay with Paystack"
              >
                <ArrowIcon />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
