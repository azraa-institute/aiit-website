import type { LegalBookPage } from './types';

/**
 * Groups PRIVACY_POLICY's sections (privacy.ts) into the interactive
 * LegalBook's pages — presentation only, references existing sections by
 * id. Never splits a section across two pages.
 *
 * Privacy Policy's sections are far less evenly sized than Terms &
 * Conditions': 'information-we-collect' (three labeled item groups) and
 * 'how-we-use-it' (a seven-item list) are each substantial on their own,
 * so they get a standalone page rather than being paired. 'cookies-and-
 * tracking' also went standalone once it grew a second paragraph
 * (disclosing the server-side consent-decision log) -- paired with
 * anything else, that extra paragraph was enough to push the page's
 * taller column past the fixed leaf height. Every other section is
 * short enough to pair two-up, same as the terms book. `label` is a
 * page running-head, not part of the legal text itself.
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
    label: 'Cookies & Tracking',
    sectionIds: ['cookies-and-tracking'],
  },
  {
    label: 'Sharing Your Information & Data Security',
    sectionIds: ['sharing-of-your-information', 'data-security'],
    layout: 'two-col',
  },
  {
    label: "Your Rights & Children's Privacy",
    sectionIds: ['your-rights', 'childrens-privacy'],
    layout: 'two-col',
  },
  {
    label: 'International Transfers & Changes',
    sectionIds: ['international-data-transfers', 'changes-to-this-policy'],
    layout: 'two-col',
  },
  {
    label: 'Contact',
    sectionIds: ['contact-us'],
  },
];
