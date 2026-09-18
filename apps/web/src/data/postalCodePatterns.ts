/**
 * Per-country postal/pin code formats, keyed by ISO 3166-1 alpha-2 (the
 * same code Profile.country/COUNTRIES use). Adapted from the Apache-2.0
 * "postal-codes-js" project's regex data (Cimpress-MCP/postal-codes-js on
 * GitHub) -- trimmed to just the ~134 of our COUNTRIES entries that
 * actually have a fixed national format; the rest (Ghana, the UAE, Hong
 * Kong, etc.) genuinely have no postal code system, so there's nothing to
 * validate there and the field stays free text.
 *
 * `redundant` lists characters the source format strips before testing
 * (almost always a space and hyphen) -- most country regexes assume that
 * stripping already happened, so it has to be reproduced here rather than
 * baked into each regex. A few countries (Ireland, Poland, Portugal) use a
 * narrower or empty set because their own regex already accounts for an
 * internal separator.
 */
export interface PostalCodePattern {
  regex: string;
  redundant: string;
  example: string;
}

export const POSTAL_CODE_PATTERNS: Record<string, PostalCodePattern> = {
  AF: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AL: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AM: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AR: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AT: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AU: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  AZ: { regex: "^AZ[0-9]{4}$", redundant: " -", example: "AZ1234" },
  BA: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  BD: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  BE: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  BG: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  BH: { regex: "^[0-9]{3,4}$", redundant: " -", example: "123" },
  BO: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  BR: { regex: "^[0-9]{8}$", redundant: " -", example: "12345678" },
  BT: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  BY: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  CA: {
    regex: "^[ABCEGHJKLMNPRSTVXY]\\d[ABCEGHJ-NPRSTV-Z][\\s\\-]?\\d[ABCEGHJ-NPRSTV-Z]\\d$",
    redundant: " -",
    example: "A4B5X5",
  },
  CH: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  CL: { regex: "^[0-9]{7}$", redundant: " -", example: "1234567" },
  CN: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  CO: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  CR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  CU: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  CV: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  CY: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  CZ: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  DE: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  DK: { regex: "^(DK){0,1}\\d{4}$", redundant: " -", example: "1124" },
  DO: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  DZ: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  EC: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  EE: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  EG: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  ES: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  ET: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  FI: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  FR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  GB: {
    regex:
      "((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([AZa-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z]))))[0-9][A-Za-z]{2})|GIR0AA",
    redundant: " -",
    example: "CW3 9SS",
  },
  GE: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  GN: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  GR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  GT: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  GW: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  HN: { regex: "^(HN)?[0-9]{5}$", redundant: " -", example: "HN12345" },
  HR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  HT: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  HU: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  ID: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  IE: {
    regex: "^[AaC-Fc-fHhKkNnPpRrTtV-Yv-y]\\d[0-9Ww][ -]?[0-9AaC-Fc-fHhKkNnPpRrTtV-Yv-y]{4}$",
    redundant: "",
    example: "D6W1234",
  },
  IL: { regex: "^[0-9]{7}$", redundant: " -", example: "1234567" },
  IN: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  IQ: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  IR: { regex: "^[0-9]{10}$", redundant: " -", example: "1234567890" },
  IS: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  IT: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  JM: { regex: "^[0-9]{2}$", redundant: " -", example: "12" },
  JO: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  JP: { regex: "^[0-9]{7}$", redundant: " -", example: "1234567" },
  KE: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  KG: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  KH: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  KR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  KW: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  KZ: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  LA: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  LB: { regex: "^[0-9]{4}(?:[0-9]{4})?$", redundant: " -", example: "1234" },
  LK: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  LR: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  LS: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  LT: { regex: "^(LT)?[0-9]{5}$", redundant: " -", example: "12345" },
  LU: { regex: "^(L){0,1}\\d{4}$", redundant: " -", example: "1124" },
  LV: { regex: "^(LV)?[0-9]{4}$", redundant: " -", example: "1234" },
  LY: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MA: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MD: { regex: "^(MD)?[0-9]{4}$", redundant: " -", example: "1234" },
  ME: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MG: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  MK: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  MM: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MN: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MT: { regex: "^[A-Z]{3}[0-9]{4}$", redundant: " -", example: "ABC1234" },
  MU: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MV: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MX: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MY: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  MZ: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  NA: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  NE: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  NG: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  NI: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  NL: { regex: "^[1-9][0-9]{3}(?!SA|SD|SS)[A-Z]{2}$", redundant: " -", example: "1235DF" },
  NO: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  NP: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  NZ: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  OM: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  PA: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  PE: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  PG: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  PH: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  PK: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  PL: { regex: "^[0-9]{2}-[0-9]{3}$", redundant: " ", example: "44-100" },
  PS: { regex: "^[0-9]{3}$", redundant: " -", example: "123" },
  PT: { regex: "^[0-9]{4}-[0-9]{3}$", redundant: " ", example: "1234-123" },
  PY: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  RO: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  RS: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  RU: { regex: "^[0-9]{3}([0-9]{3})?$", redundant: " -", example: "125" },
  SA: { regex: "^[0-9]{5}([0-9]{4})?$", redundant: " -", example: "12345" },
  SD: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  SE: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  SG: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  SI: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  SK: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  SN: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  SO: { regex: "^[a-zA-Z]{2}[0-9]{5}$", redundant: " -", example: "AW12345" },
  SV: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  SZ: { regex: "^[a-zA-Z]{1}[0-9]{3}$", redundant: " -", example: "S123" },
  TD: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  TH: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  TJ: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  TM: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  TN: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  TR: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  TT: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  TW: { regex: "^[0-9]{3}([0-9]{2})?$", redundant: " -", example: "123" },
  TZ: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  UA: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  US: { regex: "^[0-9]{5}([0-9]{4})?$", redundant: " -", example: "12345" },
  UY: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
  UZ: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  VE: { regex: "^[0-9]{4}[a-zA-Z]?$", redundant: " -", example: "1234" },
  VN: { regex: "^[0-9]{6}$", redundant: " -", example: "123456" },
  ZA: { regex: "^[0-9]{4}$", redundant: " -", example: "1234" },
  ZM: { regex: "^[0-9]{5}$", redundant: " -", example: "12345" },
};

/**
 * True if `code` is a plausible postal code for `countryCode`. A country
 * with no entry here (no fixed national format -- e.g. Ghana, the UAE, Hong
 * Kong) always passes: there's nothing to check it against, so an empty or
 * any-shaped value is accepted rather than guessed at. An empty `code`
 * always passes too -- the field itself being required or not is handled
 * separately by the caller (postal code stays optional site-wide).
 */
export function isValidPostalCode(countryCode: string, code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  const pattern = POSTAL_CODE_PATTERNS[countryCode.trim().toUpperCase()];
  if (!pattern) return true;
  let prepared = trimmed;
  for (const ch of pattern.redundant) {
    prepared = prepared.split(ch).join('');
  }
  return new RegExp(`^(?:${pattern.regex})$`, 'i').test(prepared);
}

/** The example format to show as a hint, e.g. "e.g. 100001" -- undefined for a country with no fixed format. */
export function postalCodeExample(countryCode: string): string | undefined {
  return POSTAL_CODE_PATTERNS[countryCode.trim().toUpperCase()]?.example;
}
