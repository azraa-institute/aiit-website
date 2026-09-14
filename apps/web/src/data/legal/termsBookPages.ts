/**
 * Groups TERMS_AND_CONDITIONS' sections (terms.ts) into the interactive
 * book's pages — presentation only, references existing sections by id.
 * Never splits a section across two pages; groups whole, thematically
 * related sections so the book reads as ~12 pages instead of 24 single-
 * section leaves. `label` is a page running-head, not part of the legal
 * text itself.
 */
export interface TermsBookPage {
  label: string;
  sectionIds: string[];
}

export const TERMS_BOOK_PAGES: TermsBookPage[] = [
  { label: 'About & Eligibility', sectionIds: ['about-aiit', 'eligibility'] },
  { label: 'Account Registration', sectionIds: ['account-registration'] },
  { label: 'Enrollment & Payments', sectionIds: ['course-enrollment', 'payments'] },
  { label: 'Refund Policy', sectionIds: ['refund-policy'] },
  { label: 'Membership & Certification', sectionIds: ['membership', 'certification'] },
  { label: 'Conduct & Integrity', sectionIds: ['academic-integrity', 'student-conduct'] },
  {
    label: 'Intellectual Property',
    sectionIds: ['intellectual-property', 'user-content', 'ai-generated-content'],
  },
  {
    label: 'Career & Pathways',
    sectionIds: ['career-and-employment', 'international-higher-education-pathways'],
  },
  { label: 'Platform & Privacy', sectionIds: ['third-party-services', 'privacy', 'website-availability'] },
  { label: 'Liability', sectionIds: ['limitation-of-liability', 'indemnification'] },
  { label: 'Termination & Changes', sectionIds: ['termination', 'changes-to-services'] },
  { label: 'Governing Law & Contact', sectionIds: ['governing-law', 'force-majeure', 'contact-information'] },
];
