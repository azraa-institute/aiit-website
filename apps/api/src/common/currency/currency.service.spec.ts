import { CurrencyService } from './currency.service';

function fetchResponse(rates: Record<string, number>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => ({ result: ok ? 'success' : 'error', rates }),
  } as Response;
}

describe('CurrencyService', () => {
  let service: CurrencyService;
  let fetchMock: jest.Mock;
  let now: number;

  beforeEach(() => {
    service = new CurrencyService();
    now = Date.parse('2026-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveCurrency', () => {
    it('prefers an explicit ?currency= query param', () => {
      const currency = service.resolveCurrency({
        query: { currency: 'gbp' },
        headers: { 'cf-ipcountry': 'NG' },
      });
      expect(currency).toBe('GBP');
    });

    it('falls back to the cf-ipcountry header when mapped', () => {
      const currency = service.resolveCurrency({ headers: { 'cf-ipcountry': 'NG' } });
      expect(currency).toBe('NGN');
    });

    it('falls back to USD when the country is unmapped or absent', () => {
      expect(service.resolveCurrency({ headers: {} })).toBe('USD');
      expect(service.resolveCurrency({ headers: { 'cf-ipcountry': 'ZZ' } })).toBe('USD');
    });
  });

  describe('convert', () => {
    it('returns USD as-is without hitting the network', async () => {
      const result = await service.convert(1999, 'USD');
      expect(result).toEqual({ currency: 'USD', amountCents: 1999 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('converts using a freshly fetched rate, in the target currency minor units', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1500 }));
      const result = await service.convert(1000, 'NGN');
      expect(result).toEqual({ currency: 'NGN', amountCents: 1_500_000 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reuses the cached rate within the 24h TTL', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1500 }));
      await service.convert(1000, 'NGN');

      now += 60 * 60 * 1000; // +1h, still within TTL
      const result = await service.convert(1000, 'NGN');

      expect(result).toEqual({ currency: 'NGN', amountCents: 1_500_000 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('refreshes once the 24h TTL has elapsed', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1500 }));
      await service.convert(1000, 'NGN');

      now += 25 * 60 * 60 * 1000; // +25h, past TTL
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1600 }));
      const result = await service.convert(1000, 'NGN');

      expect(result).toEqual({ currency: 'NGN', amountCents: 1_600_000 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('serves the stale cached rate when a refresh fetch fails', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1500 }));
      await service.convert(1000, 'NGN');

      now += 25 * 60 * 60 * 1000; // past TTL
      fetchMock.mockRejectedValueOnce(new Error('network down'));
      const result = await service.convert(1000, 'NGN');

      expect(result).toEqual({ currency: 'NGN', amountCents: 1_500_000 });
    });

    it('falls back to USD when there is no cache and the fetch fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));
      const result = await service.convert(1000, 'NGN');
      expect(result).toEqual({ currency: 'USD', amountCents: 1000 });
    });

    it('falls back to USD when the requested currency is missing from the rate table', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ NGN: 1500 }));
      const result = await service.convert(1000, 'XYZ');
      expect(result).toEqual({ currency: 'USD', amountCents: 1000 });
    });

    it('accounts for zero-decimal currencies via CURRENCY_MINOR_UNITS', async () => {
      fetchMock.mockResolvedValueOnce(fetchResponse({ JPY: 150.456 }));
      const result = await service.convert(1000, 'JPY');
      expect(result).toEqual({ currency: 'JPY', amountCents: 1505 });
    });
  });
});
