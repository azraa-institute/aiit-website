import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface PayPalCapture {
  status: string;
  amountCents: number;
  currency: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

/**
 * Thin REST wrapper around PayPal's Orders v2 + Webhooks APIs -- PayPal's
 * own Node SDKs are deprecated in favour of plain REST calls, which also
 * matches this repo's existing style (native fetch, no axios anywhere).
 * Fails closed: every public method throws ServiceUnavailableException if
 * PAYPAL_CLIENT_ID/SECRET aren't set, same left-unset behaviour as
 * LiveKitService/EmailService -- callers turn that into "Payments aren't
 * configured yet." at the controller layer.
 */
@Injectable()
export class PayPalClientService {
  private readonly logger = new Logger(PayPalClientService.name);
  private tokenCache: TokenCache | null = null;
  private tokenInFlight: Promise<string> | null = null;

  private get clientId(): string | undefined {
    return process.env.PAYPAL_CLIENT_ID;
  }
  private get clientSecret(): string | undefined {
    return process.env.PAYPAL_CLIENT_SECRET;
  }
  private get apiBase(): string {
    return process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException('Payments are not configured yet.');
    }
  }

  async createOrder(amountCents: number, currency: string): Promise<string> {
    this.ensureConfigured();
    const body = {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: toDecimal(amountCents) } }],
    };
    const res = await this.request('/v2/checkout/orders', { method: 'POST', body: JSON.stringify(body) });
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new ServiceUnavailableException('PayPal did not return an order id.');
    return json.id;
  }

  async captureOrder(paypalOrderId: string): Promise<PayPalCapture> {
    this.ensureConfigured();
    const res = await this.request(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
    });
    const json = (await res.json()) as {
      status?: string;
      purchase_units?: { payments?: { captures?: { amount?: { value?: string; currency_code?: string } }[] } }[];
    };
    const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
    const value = capture?.amount?.value;
    const currency = capture?.amount?.currency_code;
    if (!json.status || !value || !currency) {
      throw new ServiceUnavailableException('PayPal returned an unexpected capture response.');
    }
    return { status: json.status, amountCents: Math.round(Number(value) * 100), currency };
  }

  async verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<boolean> {
    this.ensureConfigured();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID is not set -- rejecting webhook, it cannot be verified.');
      return false;
    }
    const header = (name: string) => {
      const v = headers[name];
      return Array.isArray(v) ? v[0] : v;
    };
    const payload = {
      auth_algo: header('paypal-auth-algo'),
      cert_url: header('paypal-cert-url'),
      transmission_id: header('paypal-transmission-id'),
      transmission_sig: header('paypal-transmission-sig'),
      transmission_time: header('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: body,
    };
    if (Object.values(payload).some((v) => v === undefined)) return false;

    const res = await this.request('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === 'SUCCESS';
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }
    if (!this.tokenInFlight) {
      this.tokenInFlight = this.fetchAccessToken().finally(() => {
        this.tokenInFlight = null;
      });
    }
    return this.tokenInFlight;
  }

  private async fetchAccessToken(): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`PayPal auth failed (${res.status}).`);
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new ServiceUnavailableException('PayPal did not return an access token.');
    // Refresh a little early (60s) so a token never expires mid-request.
    const ttlMs = Math.max(0, (json.expires_in ?? 300) - 60) * 1000;
    this.tokenCache = { accessToken: json.access_token, expiresAt: Date.now() + ttlMs };
    return json.access_token;
  }

  private async request(path: string, init: { method: string; body?: string }): Promise<Response> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.apiBase}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init.body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`PayPal ${init.method} ${path} failed (${res.status}): ${text}`);
      throw new ServiceUnavailableException('PayPal request failed.');
    }
    return res;
  }
}

function toDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}
