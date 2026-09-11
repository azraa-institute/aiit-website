import { Injectable, Logger } from '@nestjs/common';
import { COUNTRY_CURRENCY, minorUnitsFor } from './country-currency.map';

const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface CurrencyRequestLike {
  query?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}

export interface DisplayPrice {
  currency: string;
  /** Integer amount in the currency's smallest unit (e.g. kobo for NGN, cents for USD) -- mirrors `priceUsdCents`, so the frontend's existing cents-based `formatPrice` needs no changes. */
  amountCents: number;
}

interface FxCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

/**
 * Resolves a request's display currency and converts USD-cent prices to it.
 * FX rates are cached in-process for 24h with lazy (on-demand) refresh; if a
 * refresh fetch fails, the stale cached rate is served rather than falling
 * straight through to USD -- a transient outage shouldn't flip every price
 * on the site back to USD for anyone whose currency was already resolved.
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cache: FxCache | null = null;
  private inFlight: Promise<FxCache> | null = null;

  resolveCurrency(request: CurrencyRequestLike): string {
    const queryParam = request.query?.currency;
    if (typeof queryParam === 'string' && queryParam.trim().length > 0) {
      return queryParam.trim().toUpperCase();
    }

    const countryHeader = request.headers['cf-ipcountry'];
    const country = Array.isArray(countryHeader) ? countryHeader[0] : countryHeader;
    if (country) {
      const mapped = COUNTRY_CURRENCY[country.toUpperCase()];
      if (mapped) return mapped;
    }

    return 'USD';
  }

  async convert(usdCents: number, currency: string): Promise<DisplayPrice> {
    if (currency === 'USD') {
      return { currency: 'USD', amountCents: usdCents };
    }

    const rate = await this.getRate(currency);
    if (rate === null) {
      return { currency: 'USD', amountCents: usdCents };
    }

    const usdAmount = usdCents / 100;
    const factor = 10 ** minorUnitsFor(currency);
    const amountCents = Math.round(usdAmount * rate * factor);
    return { currency, amountCents };
  }

  private async getRate(currency: string): Promise<number | null> {
    const cache = await this.ensureCache();
    return cache?.rates[currency] ?? null;
  }

  private async ensureCache(): Promise<FxCache | null> {
    if (this.cache && Date.now() - this.cache.fetchedAt < TTL_MS) {
      return this.cache;
    }

    if (!this.inFlight) {
      this.inFlight = this.fetchRates().finally(() => {
        this.inFlight = null;
      });
    }

    try {
      this.cache = await this.inFlight;
      return this.cache;
    } catch (error) {
      this.logger.error(
        'Failed to refresh FX rates; serving stale cache if available.',
        error instanceof Error ? error.stack : String(error),
      );
      return this.cache;
    }
  }

  private async fetchRates(): Promise<FxCache> {
    const response = await fetch(FX_URL);
    if (!response.ok) {
      throw new Error(`FX fetch failed with status ${response.status}`);
    }

    const body = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result !== 'success' || !body.rates) {
      throw new Error('FX response missing rates.');
    }

    return { rates: body.rates, fetchedAt: Date.now() };
  }
}
