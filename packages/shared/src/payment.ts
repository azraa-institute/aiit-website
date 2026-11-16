/**
 * Paid-course checkout. One provider-agnostic Order per attempted purchase
 * (see apps/api/prisma/schema.prisma's Order model) -- PayPal first,
 * Razorpay/Paystack clone the same request/response shape later.
 */

export type PaymentProvider = 'paypal' | 'razorpay' | 'paystack';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface CreatePayPalOrderRequest {
  courseSlug: string;
}

export interface CreatePayPalOrderResponse {
  paypalOrderId: string;
}

export interface CreateRazorpayOrderRequest {
  courseSlug: string;
}

export interface CreateRazorpayOrderResponse {
  razorpayOrderId: string;
  /** INR, in paise -- what Checkout.js's own `amount`/`currency` options must be opened with. */
  amountCents: number;
  currency: string;
}

export interface VerifyRazorpayPaymentRequest {
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface CreatePaystackOrderRequest {
  courseSlug: string;
}

export interface CreatePaystackOrderResponse {
  /** Passed to PaystackPop's checkout() call -- the amount/currency are already locked in server-side at this point, Inline v2 doesn't accept them from the client. */
  accessCode: string;
  reference: string;
}

/**
 * Cart/bundle checkout (Razorpay/INR only -- see PromoCodesService.priceCart).
 * A student picks any 1-N paid courses in one checkout; `promoCode` is
 * optional -- when given, only the courses it's scoped to get discounted
 * (see CartPriceResponse), everything else is priced at its own real,
 * currency-converted rate. The server always recomputes the price; the
 * frontend never computes a discount itself.
 */
export interface CreateRazorpayBundleOrderRequest {
  courseSlugs: string[];
  promoCode?: string;
}

/**
 * A PayPal or Paystack cart/bundle checkout -- any 1-N paid courses in one
 * payment, each priced at its own real rate converted into that provider's
 * currency. No `promoCode` field at all: the MBA promo-code discount is
 * Razorpay/INR-only (see CreateRazorpayBundleOrderRequest above), so these
 * two providers' bundle endpoint never accepts one.
 */
export interface CreateCartBundleOrderRequest {
  courseSlugs: string[];
}

export interface PromoPreviewRequest {
  courseSlugs: string[];
  promoCode?: string;
}

/** One cart line's resolved price -- `eligible` is true only when `promoCode` was given and this specific course falls inside that code's scope. */
export interface CartPricedLine {
  courseId: string;
  amountCents: number;
  eligible: boolean;
}

export interface CartPriceResponse {
  lines: CartPricedLine[];
  totalAmountCents: number;
  currency: string;
  /** True only if at least one line actually got the discount -- a code that matches nothing in the cart never shows as "applied." */
  promoApplied: boolean;
}

/** Admin-only -- generated/listed/managed from the admin portal, never surfaced on any public page. */
export interface AdminPromoCodeSummary {
  id: string;
  code: string;
  courseTitles: string[];
  singlePriceCents: number;
  bundlePriceCents: number;
  currency: string;
  maxRedemptions: number;
  paidRedemptionCount: number;
  active: boolean;
  createdAt: string;
}

export interface AdminPromoCodeRedemption {
  providerRef: string;
  userName: string | null;
  userEmail: string | null;
  courseCount: number;
  amountCents: number;
  paidAt: string;
}

export interface AdminPromoCodeDetail extends AdminPromoCodeSummary {
  courseIds: string[];
  redemptions: AdminPromoCodeRedemption[];
}

export interface GeneratePromoCodeRequest {
  code?: string;
  courseIds: string[];
  singlePriceCents: number;
  bundlePriceCents: number;
  maxRedemptions: number;
}

/** One course sitting in a learner's cart -- `GET /me/cart`'s response shape. */
export interface CartItemSummary {
  courseId: string;
  slug: string;
  title: string;
  image: string;
  /** This course's own real price, live-converted to the viewer's resolved currency -- same PriceInfo.amountCents convention as the catalogue, not the INR-only cart-checkout total. */
  amountCents: number | null;
  currency: string;
}

export interface AddToCartRequest {
  courseSlug: string;
}
