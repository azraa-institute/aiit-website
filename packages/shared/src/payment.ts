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
