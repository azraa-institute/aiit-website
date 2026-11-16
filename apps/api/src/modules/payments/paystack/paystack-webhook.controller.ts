import { Controller, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { PaystackClientService } from './paystack-client.service';

interface PaystackWebhookEvent {
  event?: string;
  data?: { reference?: string };
}

/**
 * Paystack -> us. Fallback confirmation path for the case where a buyer
 * completes payment then closes the tab before the frontend's own /verify
 * call finishes -- the primary path is PaystackCheckoutController.verify(),
 * called synchronously from the Inline popup's onSuccess. Paystack signs
 * webhooks with a local HMAC-SHA512 over the exact raw body, keyed by the
 * same secret key used for API auth (no separate webhook secret, unlike
 * Razorpay) -- main.ts mounts a raw body parser on this path so that body
 * is available.
 */
@Controller('payments/webhooks')
@SkipThrottle()
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly paystack: PaystackClientService,
  ) {}

  @Post('paystack')
  @HttpCode(200)
  async handle(@Req() req: Request): Promise<{ ok: true }> {
    const raw = Buffer.isBuffer(req.body) ? req.body : undefined;
    const signature = req.headers['x-paystack-signature'];
    const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
    if (!raw || !signatureHeader || !this.paystack.verifyWebhookSignature(raw, signatureHeader)) {
      this.logger.warn('Rejected a Paystack webhook with an invalid or unverifiable signature.');
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(raw.toString('utf8')) as PaystackWebhookEvent;
    } catch {
      return { ok: true };
    }

    if (event.event !== 'charge.success') return { ok: true };
    const reference = event.data?.reference;
    if (!reference) return { ok: true };

    // One providerRef can back 1 (single-course) or several (cart/bundle)
    // Order rows -- findAllByProviderRef returns whichever applies.
    const orders = await this.payments.findAllByProviderRef('paystack', reference);
    const pending = orders.filter((o) => o.status === 'pending');
    // Nothing pending: either an unknown order, or already resolved by the
    // synchronous /verify path -- a harmless race is possible here, but
    // markOrderPaid()'s own conditional update is the actual correctness
    // guarantee, not this check.
    if (pending.length === 0) return { ok: true };

    const transaction = await this.paystack.verifyTransaction(reference);
    const totalAmountCents = orders.reduce((sum, o) => sum + o.amountCents, 0);
    // See the matching comment in PaystackCheckoutController.verify() --
    // "pass transaction fees to customers" legitimately inflates the
    // charged amount above the order total, so only reject if it's less.
    if (transaction.status !== 'success' || transaction.amountCents < totalAmountCents || transaction.currency !== orders[0].currency) {
      this.logger.error(`Paystack webhook payment mismatch for providerRef ${reference}.`);
      return { ok: true };
    }

    await Promise.all(pending.map((o) => this.payments.markOrderPaid(o.id, transaction)));
    return { ok: true };
  }
}
