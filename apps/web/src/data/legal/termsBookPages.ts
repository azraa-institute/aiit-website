import type { LegalBookPage } from './types';

/**
 * Groups TERMS_AND_CONDITIONS' sections (terms.ts) into the interactive
 * LegalBook's pages — presentation only, references existing sections by
 * id. Never splits a section across two pages.
 *
 * The book viewer holds every page to the same fixed physical height
 * (see legal-book.css), so pagination here is what keeps that height
 * from being cramped (forcing internal scroll) on some pages and empty
 * on others: every page uses a two-column layout, which keeps each
 * page's vertical need to roughly the taller of its columns rather
 * than the sum of all its sections stacked. Most pages pair exactly two
 * sections this way. The closing acknowledgment (doc.closing) renders
 * on the final page only, adding height there that a plain section
 * count wouldn't predict -- that's why the final page ("Contact") gets
 * only one section instead of two, and why "Governing Law & Force
 * Majeure" (the pairing that would otherwise have absorbed contact-
 * information as a third section) stays a clean pair instead. `label`
 * is a page running-head, not part of the legal text itself.
 */
export const TERMS_BOOK_PAGES: LegalBookPage[] = [
  {
    label: 'About & Eligibility',
    sectionIds: ['about-aiit', 'eligibility'],
    layout: 'two-col',
  },
  {
    label: 'Account & Enrollment',
    sectionIds: ['account-registration', 'course-enrollment'],
    layout: 'two-col',
  },
  {
    label: 'Payments & Refunds',
    sectionIds: ['payments', 'refund-policy'],
    layout: 'two-col',
  },
  {
    label: 'Membership & Certification',
    sectionIds: ['membership', 'certification'],
    layout: 'two-col',
  },
  {
    label: 'Conduct & Integrity',
    sectionIds: ['academic-integrity', 'student-conduct'],
    layout: 'two-col',
  },
  {
    label: 'Intellectual Property & User Content',
    sectionIds: ['intellectual-property', 'user-content'],
    layout: 'two-col',
  },
  {
    label: 'AI Content & Third-Party Services',
    sectionIds: ['ai-generated-content', 'third-party-services'],
    layout: 'two-col',
  },
  {
    label: 'Career & Global Pathways',
    sectionIds: ['career-and-employment', 'international-higher-education-pathways'],
    layout: 'two-col',
  },
  {
    label: 'Privacy & Availability',
    sectionIds: ['privacy', 'website-availability'],
    layout: 'two-col',
  },
  {
    label: 'Liability & Indemnification',
    sectionIds: ['limitation-of-liability', 'indemnification'],
    layout: 'two-col',
  },
  {
    label: 'Termination & Changes',
    sectionIds: ['termination', 'changes-to-services'],
    layout: 'two-col',
  },
  {
    label: 'Governing Law & Force Majeure',
    sectionIds: ['governing-law', 'force-majeure'],
    layout: 'two-col',
  },
  {
    label: 'Contact',
    sectionIds: ['contact-information'],
  },
];
