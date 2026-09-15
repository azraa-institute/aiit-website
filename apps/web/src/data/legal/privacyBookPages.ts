import type { LegalBookPage } from './types';

/**
 * Groups PRIVACY_POLICY's sections (privacy.ts) into the interactive
 * LegalBook's pages — presentation only, references existing sections by
 * id. Never splits a section across two pages.
 *
 * Privacy Policy's sections are far less evenly sized than Terms &
 * Conditions': 'information-we-collect' (three labeled item groups) and
 * 'how-we-use-it' (a seven-item list) are each substantial on their
 * own, so they get a standalone page rather than being paired -- pairing
 * either with anything else would make that page's taller column blow
 * past the fixed leaf height and force internal scroll. Every other
 * section is short enough to pair two-up, same as the terms book.
 * `label` is a page running-head, not part of the legal text itself.
 */
export const PRIVACY_BOOK_PAGES: LegalBookPage[] = [
  {
    label: 'Information We Collect',
    sectionIds: ['information-we-collect'],
  },
  {
    label: 'How We Use Your Information',
    sectionIds: ['how-we-use-it'],
  },
  {
    label: 'Sharing & Cookies',
    sectionIds: ['sharing-of-your-information', 'cookies-and-tracking'],
    layout: 'two-col',
  },
  {
    label: 'Security & Your Rights',
    sectionIds: ['data-security', 'your-rights'],
    layout: 'two-col',
  },
  {
    label: "Children's Privacy & International Transfers",
    sectionIds: ['childrens-privacy', 'international-data-transfers'],
    layout: 'two-col',
  },
  {
    label: 'Changes & Contact',
    sectionIds: ['changes-to-this-policy', 'contact-us'],
    layout: 'two-col',
  },
];
