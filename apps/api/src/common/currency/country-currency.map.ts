/** Best-effort ISO 3166-1 alpha-2 country -> ISO 4217 currency code map for display conversion. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN',
  US: 'USD',
  GB: 'GBP',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
  EG: 'EGP',
  CA: 'CAD',
  AU: 'AUD',
  IN: 'INR',
  JP: 'JPY',
  CN: 'CNY',
  BR: 'BRL',
  MX: 'MXN',
  AE: 'AED',
  SA: 'SAR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  KR: 'KRW',
  SG: 'SGD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  TR: 'TRY',
  RU: 'RUB',
  NZ: 'NZD',
};

/** Decimal places for a currency's minor unit. Zero-decimal currencies (e.g. JPY) override the default of 2. */
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
};

export function minorUnitsFor(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency] ?? 2;
}
