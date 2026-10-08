import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface PaystackTransaction {
  status: string;
  amountCents: number;
  currency: string;
}

/**
 * Thin REST wrapper around Paystack's Transaction API -- no SDK, matching
 * PayPalClientService/RazorpayClientService's native-`fetch` convention.
 * Auth is a plain Bearer token (the secret key) on every request -- no
 * OAuth exchange (PayPal) and no separate webhook secret (Razorpay):
 * Paystack signs webhooks with the same secret key used for API auth.
 * Fails closed: every public method throws ServiceUnavailableException if
 * PAYSTACK_SECRET_KEY isn't set -- callers turn that into "Payments are not
 * configured yet." at the controller layer.
 */
@Injectable()
export class PaystackClientService {
  private readonly logger = new Logger(PaystackClientService.name);
  private readonly apiBase = 'https://api.paystack.co';

  private get secretKey(): string | undefined {
    return process.env.PAYSTACK_SECRET_KEY;
  }

  private ensureConfigured(): void {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Payments are not configured yet.');
    }
  }

  async initializeTransaction(amountCents: number, currency: string, email: string, reference: string): Promise<{ accessCode: string; reference: string }> {
    this.ensureConfigured();
    const res = await this.request('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({ email, amount: amountCents, currency, reference }),
    });
    const json = (await res.json()) as { data?: { access_code?: string; reference?: string } };
    const accessCode = json.data?.access_code;
    const returnedReference = json.data?.reference;
    if (!accessCode || !returnedReference) {
      throw new ServiceUnavailableException('Paystack did not return an access code.');
    }
    return { accessCode, reference: returnedReference };
  }

  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    this.ensureConfigured();
    const res = await this.request(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
    const json = (await res.json()) as { data?: { status?: string; amount?: number; currency?: string } };
    const { status, amount, currency } = json.data ?? {};
    if (!status || amount == null || !currency) {
      throw new ServiceUnavailableException('Paystack returned an unexpected verification response.');
    }
    return { status, amountCents: amount, currency };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    this.ensureConfigured();
    const expected = createHmac('sha512', this.secretKey as string).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signatureHeader, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private async request(path: string, init: { method: string; body?: string }): Promise<Response> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
      body: init.body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Paystack ${init.method} ${path} failed (${res.status}): ${text}`);
      throw new ServiceUnavailableException('Paystack request failed.');
    }
    return res;
  }
}
