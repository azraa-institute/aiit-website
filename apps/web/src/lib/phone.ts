import { COUNTRIES } from '@/data/countries';

/**
 * Public path to a country's flag SVG. Native <option> elements can only
 * render plain text (no <img>), and flag emoji fall back to plain 2-letter
 * codes on Windows Chrome -- confirmed live, not a guess -- so the phone
 * "Country code" picker is a custom dropdown (PhoneCountrySelect) that can
 * actually show these images. Source: apps/web/public/assets/flags/, one
 * <iso2>.svg per COUNTRIES entry.
 */
export function flagSrc(iso2: string): string {
  return `/assets/flags/${iso2.toLowerCase()}.svg`;
}

const DIAL_BY_COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.dial]));

/** Longest dial code first, so e.g. a "+254..." number isn't mis-split against a shorter prefix. */
const DIAL_CODES_LONGEST_FIRST = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

/**
 * Splits a stored E.164 number (e.g. "+2348012345678") back into a country-code
 * dropdown value and the national number, for prefilling the edit form. Several
 * countries share a dial code (the NANP "1" for US/Canada/Jamaica/...); a tie
 * resolves to whichever appears first in COUNTRIES -- that only affects which
 * flag is shown, never the stored number itself.
 */
export function splitPhone(e164: string | null | undefined): { country: string; national: string } {
  const digits = (e164 ?? '').replace(/^\+/, '');
  if (!digits) return { country: '', national: '' };
  const dial = DIAL_CODES_LONGEST_FIRST.find((d) => digits.startsWith(d));
  if (!dial) return { country: '', national: digits };
  const country = COUNTRIES.find((c) => c.dial === dial)?.code ?? '';
  return { country, national: digits.slice(dial.length) };
}

/**
 * Combines a country-code dropdown value + a raw national number into an E.164
 * string, or '' if either half is missing. Strips one leading trunk "0" (e.g.
 * Nigerian numbers are commonly written "0803...") and any other non-digit
 * formatting the learner typed.
 */
export function combinePhone(country: string, national: string): string {
  const dial = DIAL_BY_COUNTRY.get(country);
  const digits = national.replace(/\D/g, '').replace(/^0/, '');
  if (!dial || !digits) return '';
  return `+${dial}${digits}`;
}
