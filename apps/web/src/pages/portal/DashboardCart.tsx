import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CartPriceResponse } from '@aiit/shared';
import { Plate } from '@/components/primitives/Plate';
import { Button } from '@/components/primitives/Button';
import { PaymentMethodPicker } from '@/components/common/PaymentMethodPicker';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useCart, removeFromCart, invalidateCart } from './cartData';
import { invalidateLearner } from './learnerData';
import './dashboard-cart.css';

function formatRupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

type PriceState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; data: CartPriceResponse } | { status: 'error'; message: string };

/** The learner dashboard's cart widget -- only ever rendered by DashboardPage once the cart actually has something in it. */
export function DashboardCart() {
  const cart = useCart();
  // DashboardPage's own useScrollReveal() already ran its one-time scan
  // before this section exists in the DOM (it only mounts once useCart()
  // resolves, via the early `return null` below) -- without this, the
  // section's [data-reveal] never gets observed and stays invisible
  // forever (confirmed live: it rendered with real content in the DOM,
  // just never painted). Keyed on cart.status so the scan re-runs the
  // moment this section actually appears.
  useScrollReveal([cart.status]);
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState('');
  // Only set once the student actually clicks "Redeem coupon" (or presses
  // Enter) -- the price preview re-fetches on every cart change regardless
  // (so the running total is always live), but a typed code is only sent
  // once redeemed, not on every keystroke.
  const [appliedCode, setAppliedCode] = useState('');
  const [price, setPrice] = useState<PriceState>({ status: 'idle' });

  const courseSlugs = cart.status === 'ready' ? cart.items.map((i) => i.slug) : [];
  const key = courseSlugs.join(',');
  const hasAnyProvider = Boolean(
    import.meta.env.VITE_PAYPAL_CLIENT_ID || import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  );

  useEffect(() => {
    if (courseSlugs.length === 0) {
      setPrice({ status: 'idle' });
      return;
    }
    let alive = true;
    setPrice({ status: 'loading' });
    apiFetch<CartPriceResponse>('/payment-promos/preview', {
      method: 'POST',
      body: JSON.stringify({ courseSlugs, promoCode: appliedCode || undefined }),
    })
      .then((data) => {
        if (alive) setPrice({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setPrice({ status: 'error', message: err instanceof ApiError ? err.message : 'Could not redeem that coupon.' });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is courseSlugs.join(','), the real dependency; courseSlugs itself is a fresh array every render.
  }, [key, appliedCode]);

  if (cart.status !== 'ready' || cart.items.length === 0) return null;

  const lineByCourseId = new Map(price.status === 'ready' ? price.data.lines.map((l) => [l.courseId, l]) : []);
  const ineligibleCount = price.status === 'ready' && price.data.promoApplied ? price.data.lines.filter((l) => !l.eligible).length : 0;

  function redeemCoupon() {
    setAppliedCode(promoInput.trim());
  }

  return (
    <section className="dash__cart" data-reveal aria-label="Your cart">
      <div className="dash__block-head">
        <p className="portal-eyebrow">Your cart</p>
        <p className="dash__cart-count">
          {cart.items.length} course{cart.items.length === 1 ? '' : 's'}
        </p>
      </div>

      <ul className="cart-list" role="list">
        {cart.items.map((item) => {
          const line = lineByCourseId.get(item.courseId);
          return (
            <li key={item.courseId} className={cn('cart-row', line?.eligible && 'is-coupon-eligible')}>
              <Plate source={item.image} seed={item.slug} ratio={1} fit="contain" className="cart-row__plate" />
              <div className="cart-row__body">
                <span className="cart-row__title">{item.title}</span>
                {line?.eligible ? <span className="cart-row__badge">Coupon applied</span> : null}
              </div>
              <span className="cart-row__price">{line ? formatRupees(line.amountCents) : '…'}</span>
              <button type="button" className="cart-row__remove" aria-label={`Remove ${item.title} from cart`} onClick={() => removeFromCart(item.courseId)}>
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className="dash__cart-checkout">
        <div className="dash__cart-promo">
          <label htmlFor="dash-cart-promo-input">Have a promo code?</label>
          <div className="dash__cart-promo-row">
            <input
              id="dash-cart-promo-input"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') redeemCoupon();
              }}
              placeholder="Enter your code"
              maxLength={40}
            />
            <Button as="button" type="button" variant="secondary" size="sm" onClick={redeemCoupon} disabled={!promoInput.trim()}>
              Redeem coupon
            </Button>
          </div>
        </div>

        {price.status === 'loading' ? <p className="dash__cart-note">Checking…</p> : null}
        {price.status === 'error' ? <p className="dash__cart-note dash__cart-note--error">{price.message}</p> : null}
        {ineligibleCount > 0 ? (
          <p className="dash__cart-note">
            {ineligibleCount} course{ineligibleCount === 1 ? '' : 's'} in your cart {ineligibleCount === 1 ? "isn't" : "aren't"} eligible for this coupon,
            they&apos;ll be charged at the regular price.
          </p>
        ) : null}

        <div className="dash__cart-total-row">
          <span className="dash__cart-total-label">Total</span>
          <span className="dash__cart-total-value">{price.status === 'ready' ? formatRupees(price.data.totalAmountCents) : '…'}</span>
        </div>

        {!hasAnyProvider ? (
          <p className="dash__cart-note">Online payment isn&apos;t available yet.</p>
        ) : price.status === 'ready' ? (
          <PaymentMethodPicker
            courseSlugs={courseSlugs}
            promoCode={appliedCode || undefined}
            razorpayOnly={price.data.promoApplied}
            onSuccess={() => {
              invalidateLearner();
              invalidateCart();
              navigate('/portal/courses');
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
