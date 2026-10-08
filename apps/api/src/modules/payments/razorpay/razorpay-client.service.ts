import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface RazorpayPayment {
  status: string;
  amountCents: number;
  currency: string;
  orderId: string;
}

/**
 * Thin REST wrapper around Razorpay's Orders + Payments APIs -- no SDK,
 * matching this repo's existing native-`fetch` convention
 * (PayPalClientService). Simpler than PayPal: Razorpay authenticates every
 * request with HTTP Basic (Key ID : Key Secret) directly, no OAuth token
 * exchange/cache needed. Fails closed: every public method throws
 * ServiceUnavailableException if RAZORPAY_KEY_ID/SECRET aren't set, same
 * left-unset behaviour as PayPalClientService -- callers turn that into
 * "Payments are not configured yet." at the controller layer.
 */
@Injectable()
export class RazorpayClientService {
  private readonly logger = new Logger(RazorpayClientService.name);
  private readonly apiBase = 'https://api.razorpay.com/v1';

  private get keyId(): string | undefined {
    return process.env.RAZORPAY_KEY_ID;
  }
  private get keySecret(): string | undefined {
    return process.env.RAZORPAY_KEY_SECRET;
  }

  private ensureConfigured(): void {
    if (!this.keyId || !this.keySecret) {
      throw new ServiceUnavailableException('Payments are not configured yet.');
    }
  }

  async createOrder(amountCents: number, currency: string, receipt: string): Promise<string> {
    this.ensureConfigured();
    const res = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({ amount: amountCents, currency, receipt }),
    });
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new ServiceUnavailableException('Razorpay did not return an order id.');
    return json.id;
  }

  /** Local HMAC check -- Razorpay has no remote verify-signature API (unlike PayPal). */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    this.ensureConfigured();
    return safeCompare(hmacHex(`${orderId}|${paymentId}`, this.keySecret as string), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET is not set -- rejecting webhook, it cannot be verified.');
      return false;
    }
    return safeCompare(hmacHex(rawBody, secret), signatureHeader);
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    this.ensureConfigured();
    const res = await this.request(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
    const json = (await res.json()) as { status?: string; amount?: number; currency?: string; order_id?: string };
    if (!json.status || json.amount == null || !json.currency || !json.order_id) {
      throw new ServiceUnavailableException('Razorpay returned an unexpected payment response.');
    }
    return { status: json.status, amountCents: json.amount, currency: json.currency, orderId: json.order_id };
  }

  private async request(path: string, init: { method: string; body?: string }): Promise<Response> {
    const basic = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch(`${this.apiBase}${path}`, {
      method: init.method,
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
      body: init.body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Razorpay ${init.method} ${path} failed (${res.status}): ${text}`);
      throw new ServiceUnavailableException('Razorpay request failed.');
    }
    return res;
  }
}

function hmacHex(data: string | Buffer, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
