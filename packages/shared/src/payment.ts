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
 * Promo-code bundle checkout (MBA certification courses, Razorpay/INR only
 * -- see PromoCodesService.priceCheckout). A student picks 1-N of a code's
 * scoped courses in one checkout; the server recomputes the real price,
 * the frontend never computes a discount itself.
 */
export interface CreateRazorpayBundleOrderRequest {
  courseSlugs: string[];
  promoCode: string;
}

export interface PromoPreviewRequest {
  courseSlugs: string[];
  promoCode: string;
}

export interface PromoPreviewResponse {
  pricePerCourseCents: number;
  totalAmountCents: number;
  currency: string;
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
