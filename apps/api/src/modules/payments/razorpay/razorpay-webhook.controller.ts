import { Controller, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { RazorpayClientService } from './razorpay-client.service';

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string };
    };
  };
}

/**
 * Razorpay -> us. Fallback confirmation path for the case where a buyer
 * completes payment then closes the tab before the frontend's own /verify
 * call finishes -- the primary path is RazorpayCheckoutController.verify(),
 * called synchronously from Checkout.js's `handler`. Unlike PayPal (which
 * verifies via PayPal's own remote API), Razorpay signs webhooks with a
 * local HMAC over the exact raw body, so main.ts mounts a raw body parser
 * on this path -- req.body arrives here as a Buffer, not parsed JSON.
 */
@Controller('payments/webhooks')
@SkipThrottle()
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly razorpay: RazorpayClientService,
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async handle(@Req() req: Request): Promise<{ ok: true }> {
    const raw = Buffer.isBuffer(req.body) ? req.body : undefined;
    const signature = req.headers['x-razorpay-signature'];
    const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
    if (!raw || !signatureHeader || !this.razorpay.verifyWebhookSignature(raw, signatureHeader)) {
      this.logger.warn('Rejected a Razorpay webhook with an invalid or unverifiable signature.');
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(raw.toString('utf8')) as RazorpayWebhookEvent;
    } catch {
      return { ok: true };
    }

    if (event.event !== 'payment.captured') return { ok: true };
    const entity = event.payload?.payment?.entity;
    const razorpayOrderId = entity?.order_id;
    const paymentId = entity?.id;
    if (!razorpayOrderId || !paymentId) return { ok: true };

    const order = await this.payments.findByProviderRef('razorpay', razorpayOrderId);
    // Missing, or already resolved by the synchronous /verify path -- a
    // harmless race is possible here, but markOrderPaid()'s own conditional
    // update is the actual correctness guarantee, not this check.
    if (!order || order.status !== 'pending') return { ok: true };

    const payment = await this.razorpay.fetchPayment(paymentId);
    // See the matching comment in RazorpayCheckoutController.verify() -- a
    // Convenience Fee (if ever activated) legitimately inflates the
    // captured amount above order.amountCents, so only reject if it's less.
    if (payment.status !== 'captured' || payment.amountCents < order.amountCents || payment.currency !== order.currency) {
      this.logger.error(`Razorpay webhook payment mismatch for order ${order.id}.`);
      return { ok: true };
    }

    await this.payments.markOrderPaid(order.id, payment);
    return { ok: true };
  }
}
