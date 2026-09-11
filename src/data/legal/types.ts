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
