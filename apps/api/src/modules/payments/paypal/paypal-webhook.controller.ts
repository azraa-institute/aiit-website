import { Controller, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { PayPalClientService } from './paypal-client.service';

interface PayPalWebhookEvent {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

/**
 * PayPal -> us. Fallback confirmation path for the case where a buyer
 * approves then closes the tab before the frontend's own capture call
 * finishes -- the primary path is PayPalCheckoutController.capture(),
 * called synchronously from onApprove. Verified via PayPal's own
 * verify-webhook-signature API (not a local HMAC, unlike LiveKit's webhook),
 * so no raw-body middleware is needed here; the parsed JSON body is exactly
 * what that API expects as `webhook_event`.
 */
@Controller('payments/webhooks')
@SkipThrottle()
export class PayPalWebhookController {
  private readonly logger = new Logger(PayPalWebhookController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly paypal: PayPalClientService,
  ) {}

  @Post('paypal')
  @HttpCode(200)
  async handle(@Req() req: Request): Promise<{ ok: true }> {
    const body = req.body as PayPalWebhookEvent;
    const verified = await this.paypal
      .verifyWebhookSignature(req.headers as Record<string, string | string[] | undefined>, body)
      .catch(() => false);
    if (!verified) {
      this.logger.warn('Rejected a PayPal webhook with an invalid or unverifiable signature.');
      // Still 200 -- PayPal doesn't need an explanation, and a payload that
      // will never verify shouldn't be retried.
      return { ok: true };
    }

    const paypalOrderId = resolveOrderId(body);
    if (!paypalOrderId) return { ok: true };

    const order = await this.payments.findByProviderRef('paypal', paypalOrderId);
    // Missing, or already resolved by the synchronous capture path -- a
    // harmless race against onApprove()'s own call is possible here (both
    // could pass this check before either writes), but markOrderPaid()'s
    // own conditional update is the actual correctness guarantee, not this
    // check -- it's just an optimization to skip a redundant PayPal call.
    if (!order || order.status !== 'pending') return { ok: true };

    const capture = await this.paypal.captureOrder(paypalOrderId);
    if (capture.status !== 'COMPLETED' || capture.amountCents !== order.amountCents || capture.currency !== order.currency) {
      this.logger.error(`PayPal webhook capture mismatch for order ${order.id}.`);
      return { ok: true };
    }

    await this.payments.markOrderPaid(order.id, capture);
    return { ok: true };
  }
}

function resolveOrderId(body: PayPalWebhookEvent): string | undefined {
  if (body.event_type === 'CHECKOUT.ORDER.APPROVED') return body.resource?.id;
  if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED') return body.resource?.supplementary_data?.related_ids?.order_id;
  return undefined;
}
