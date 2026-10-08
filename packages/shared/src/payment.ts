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
