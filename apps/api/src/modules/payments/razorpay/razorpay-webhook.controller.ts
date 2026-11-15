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

    // Usually one Order; for a promo-code bundle checkout (see
    // PaymentsService.createPendingBundleOrder) several Order rows share
    // this one providerRef, and all of them need marking paid together.
    const orders = await this.payments.findAllByProviderRef('razorpay', razorpayOrderId);
    const pending = orders.filter((o) => o.status === 'pending');
    // Missing, or already resolved by the synchronous /verify path -- a
    // harmless race is possible here, but markOrderPaid()'s own conditional
    // update is the actual correctness guarantee, not this check.
    if (pending.length === 0) return { ok: true };

    const payment = await this.razorpay.fetchPayment(paymentId);
    const totalAmountCents = pending.reduce((sum, o) => sum + o.amountCents, 0);
    // See the matching comment in RazorpayCheckoutController.verify() -- a
    // Convenience Fee (if ever activated) legitimately inflates the
    // captured amount above the order total, so only reject if it's less.
    if (payment.status !== 'captured' || payment.amountCents < totalAmountCents || payment.currency !== pending[0].currency) {
      this.logger.error(`Razorpay webhook payment mismatch for providerRef ${razorpayOrderId}.`);
      return { ok: true };
    }

    await Promise.all(pending.map((o) => this.payments.markOrderPaid(o.id, payment)));
    return { ok: true };
  }
}
