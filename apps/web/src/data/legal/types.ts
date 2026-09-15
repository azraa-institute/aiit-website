export interface LegalGroup {
  label?: string;
  items: string[];
}

export interface LegalSection {
  id: string;
  title: string;
  /** Short lead-in line before the body. */
  lead?: string;
  paragraphs?: string[];
  groups?: LegalGroup[];
  items?: string[];
  /** A standout clause, rendered in the manuscript's callout style. */
  clause?: string;
}

export interface LegalDoc {
  title: string;
  eyebrow: string;
  intro: string;
  effectiveLabel: string;
  effectiveDate: string;
  sections: LegalSection[];
  closing: string[];
}

/**
 * One page of the interactive LegalBook viewer (see
 * pages/LegalBook.tsx) -- presentation only, references a
 * LegalDoc's own sections by id. Never splits a section across two
 * pages. `layout: 'two-col'` is for exactly two sections that read well
 * side by side; omit (or 'single') for everything else, including a
 * long item list or three-plus sections.
 */
export interface LegalBookPage {
  label: string;
  sectionIds: string[];
  layout?: 'single' | 'two-col';
}
