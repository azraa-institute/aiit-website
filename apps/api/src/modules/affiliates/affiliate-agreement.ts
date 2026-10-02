/**
 * The single source of truth for the Affiliate Agreement's legal text --
 * rendered both inline on the public apply form (GET /affiliates/agreement,
 * see affiliate-agreement.controller.ts) and into the generated PDF (see
 * affiliate-agreement-pdf.service.ts). packages/shared can't hold this (it's
 * type-only by its own explicit convention), so it lives here once instead
 * of risking two copies drifting apart.
 *
 * Builds on AIIT's existing signed document
 * (apps/web/public/assets/affiliate/aiit-affiliate-agreement.pdf) -- same
 * parties, purpose, eligible categories, 10% student discount, commission
 * structure ($5/$7/$10, matching the live AffiliatePage.tsx copy exactly),
 * content-creator provisions, payment terms and term/termination -- with
 * clauses added that the original was missing for a real commercial
 * agreement: confidentiality, IP/marks, data protection, advertising-
 * disclosure compliance, taxes, limitation of liability, indemnification,
 * force majeure, capacity to contract, compliance with law, assignment,
 * severability, notices, and an electronic-signature consent clause (the
 * one that makes the typed-signature flow itself contractually sound, not
 * just a UI nicety).
 *
 * IMPORTANT: this is template language drafted from the existing document
 * and standard referral-agreement practice, not a substitute for review by
 * a qualified attorney licensed in India and Nigeria (the two governing-law
 * jurisdictions named in Clause 20.3) before being relied on at real
 * commercial scale.
 */

export const AFFILIATE_AGREEMENT_VERSION = '2026-10-03';

export interface AffiliateAgreementSection {
  heading: string;
  paragraphs: string[];
}

export const AFFILIATE_AGREEMENT_SECTIONS: AffiliateAgreementSection[] = [
  {
    heading: '1. Parties',
    paragraphs: [
      'This Individual Partner Referral Agreement (the "Agreement") is entered into between Azraa Institute of Information Technology (AIIT), operating as AIIT Academy / AIIT.network, with its registered office at 36, Farook Nagar 1st Cross, Kovaipudur, Coimbatore – 641042, Tamil Nadu, India (referred to as "AIIT", "the Institute", or "we"), and the individual identified by the name, email and signature on the application and signature page of this Agreement (referred to as the "Partner" or "you").',
      'AIIT and the Partner are collectively referred to as the "Parties".',
    ],
  },
  {
    heading: '2. Purpose of the Agreement',
    paragraphs: [
      "The purpose of this Agreement is to appoint the Partner to identify, mobilise and refer eligible individuals to register and enrol on the AIIT.network learning platform for AIIT's technology and digital skills programmes. The Partner may also introduce Content Creators who will further promote AIIT programmes to their audiences, and may refer other individuals to become Partners themselves.",
    ],
  },
  {
    heading: '3. Eligible Student / Learner Categories',
    paragraphs: [
      'The Partner is authorised to refer individuals who fall into any of the following categories:',
      '• Senior Secondary / Pre-University level: students in SS3 / Standard 12 / Class 12 / Plus Two, and also SS2 / Standard 11 / Grade 11 / Class 11 (or equivalent senior secondary levels in West Africa, Asia and other regions);',
      '• individuals engaged in business or professional work;',
      '• students currently enrolled in higher education institutions;',
      '• graduates seeking to upskill or reskill in technology and digital fields.',
      'All such categories are eligible to join the AIIT platform (including any related learning environment).',
    ],
  },
  {
    heading: '4. Student Discount Incentive',
    paragraphs: [
      'To encourage eligible individuals to register through the Partner rather than directly on the AIIT.network website, any student who registers using the Partner’s unique referral link (or a Content Creator’s link introduced by the Partner) shall receive a ten percent (10%) discount on the published fee of the course(s) for which they enrol. Students who register directly, without using any Partner or Content Creator referral link, pay the full published course fee with no discount.',
      'This 10% discount is the primary commercial reason for a student to choose to register through the Partner. The Partner is expected to clearly communicate this benefit when promoting AIIT programmes.',
    ],
  },
  {
    heading: '5. Obligations of the Partner',
    paragraphs: [
      'The Partner shall promote AIIT programmes honestly and accurately, and shall not make false or misleading claims about courses, fees, outcomes, internships or scholarships. The Partner shall correctly present the 10% discount as available only to referred students.',
      'The Partner shall ensure that referred individuals meet the eligibility categories described in Clause 3 and that registrations are genuine.',
      'The Partner shall use only approved promotional materials and the unique referral link issued by AIIT.',
      'The Partner shall not collect course fees from students on behalf of AIIT unless expressly authorised in writing.',
    ],
  },
  {
    heading: '6. Commission Structure',
    paragraphs: [
      'Subject to successful registration and verification of the referred learner on the AIIT platform, the Partner shall be entitled to the following commissions (all amounts in United States Dollars – USD):',
      '• Direct referral: the Partner brings the student directly, using the Partner’s own referral link — $7.00 per successfully registered student.',
      '• Via a Content Creator: the Partner introduces a Content Creator, who then refers students using their own link — $5.00 per student referred by that Content Creator.',
      '• Volume uplift: once the Partner’s cumulative direct referrals reach 500 or more students, the rate for further direct referrals rises to $10.00 per student.',
      '“Successfully registered” means the student has completed the required registration process on the AIIT platform and has been verified by AIIT as a valid new learner attributable to the Partner’s or a Content Creator’s referral link. Commissions become payable only after AIIT’s verification and according to the payment schedule in Clause 8.',
    ],
  },
  {
    heading: '7. Content Creators',
    paragraphs: [
      'A "Content Creator" for the purpose of this Agreement is an individual or entity with a significant online followership, with a preferred benchmark of approximately 50,000 followers or more (or a followership reasonably close to this benchmark as may be accepted by AIIT on a case-by-case basis).',
      'When the Partner introduces a Content Creator to AIIT, AIIT may enter into a separate agreement directly with that Content Creator regarding promotional activities, referral links and any compensation payable by AIIT to the Content Creator. Such agreement is solely between AIIT and the Content Creator.',
      'The Partner may maintain a private, independent commercial arrangement with any Content Creator the Partner introduces. Any such private arrangement is entirely between the Partner and the Content Creator and does not involve AIIT, create any obligation on AIIT, or affect the commissions payable by AIIT to the Partner under this Agreement.',
      'For every student successfully referred by a Content Creator introduced by the Partner, the Partner shall receive the commission stated in Clause 6. Students referred via such Content Creators also receive the 10% discount under Clause 4.',
    ],
  },
  {
    heading: '8. Payment Terms',
    paragraphs: [
      'AIIT shall maintain records of referrals attributed to the Partner and to Content Creators introduced by the Partner.',
      'Commissions shall be calculated and paid periodically (e.g. monthly, or as otherwise agreed in writing) after verification of eligible registrations. Payment method and any applicable tax deductions shall be confirmed in writing.',
      'AIIT reserves the right to withhold or reverse commission on registrations that are found to be fraudulent, duplicated, or otherwise invalid.',
    ],
  },
  {
    heading: '9. Term and Termination',
    paragraphs: [
      'This Agreement commences on the date of the Partner’s electronic signature (Clause 21) and continues until terminated by either Party.',
      'Either Party may terminate this Agreement by giving thirty (30) days’ written notice to the other Party. AIIT may terminate this Agreement immediately in cases of material breach, fraud, misrepresentation, or conduct that damages AIIT’s reputation.',
      'Upon termination, the Partner remains entitled to commissions already earned on verified registrations completed before the effective termination date, subject to Clause 8.',
    ],
  },
  {
    heading: '10. Confidentiality',
    paragraphs: [
      'The Partner shall keep confidential any non-public information disclosed by AIIT in connection with this Agreement — including pricing, unpublished programmes, internal processes and referral data — and shall not disclose it to any third party during the term of this Agreement or at any time afterwards, except as required by law.',
    ],
  },
  {
    heading: '11. Intellectual Property and Use of Marks',
    paragraphs: [
      'All intellectual property in the AIIT platform, course content, brand name, logo and marks remains the exclusive property of AIIT. The Partner may use only promotional materials and marks approved or provided by AIIT, solely for promoting AIIT programmes under this Agreement, and may not alter, obscure or combine AIIT’s logo or marks with other branding without AIIT’s prior written consent. Nothing in this Agreement grants the Partner any licence or right in AIIT’s intellectual property beyond this limited promotional use.',
    ],
  },
  {
    heading: '12. Data Protection',
    paragraphs: [
      'Where the Partner collects or handles any personal data of a referred individual in the course of making a referral, the Partner shall handle that data in compliance with applicable data protection law (including India’s Digital Personal Data Protection Act 2023, Nigeria’s Data Protection Act / NDPR, and the EU General Data Protection Regulation where applicable), and shall not retain, sell, or use such personal data for any purpose beyond making the referral to AIIT.',
    ],
  },
  {
    heading: '13. Advertising and Disclosure Compliance',
    paragraphs: [
      'When promoting AIIT programmes, the Partner shall comply with applicable advertising, consumer-protection and influencer-disclosure laws and guidelines in their jurisdiction — including clearly and conspicuously disclosing the paid or referral relationship with AIIT where such disclosure is legally required (for example under frameworks comparable to the US FTC Endorsement Guides or India’s ASCI Influencer Advertising Guidelines) — and shall comply with the terms of service of any platform (social media, messaging, or otherwise) used to promote AIIT programmes.',
    ],
  },
  {
    heading: '14. Taxes',
    paragraphs: [
      'The Partner is solely responsible for determining, reporting and paying all taxes owed on commission income received under this Agreement in their jurisdiction. AIIT may withhold tax from commission payments where legally required to do so, and will report payments as required by applicable law.',
    ],
  },
  {
    heading: '15. Limitation of Liability',
    paragraphs: [
      "AIIT's total liability to the Partner arising out of or in connection with this Agreement is limited to commissions actually earned by the Partner and unpaid as of the date the claim arises. Neither Party shall be liable to the other for any indirect, incidental, consequential, special or punitive damages, including loss of profits or opportunity, arising out of or in connection with this Agreement, even if advised of the possibility of such damages.",
    ],
  },
  {
    heading: '16. Indemnification',
    paragraphs: [
      "The Partner shall indemnify and hold AIIT harmless from and against any claims, losses, liabilities and reasonable expenses (including legal fees) arising from the Partner's breach of this Agreement, misrepresentation, negligence, or violation of applicable law in the course of performing under this Agreement.",
    ],
  },
  {
    heading: '17. Force Majeure',
    paragraphs: [
      'Neither Party shall be liable for any delay or failure to perform its obligations under this Agreement (other than a payment obligation already due) resulting from causes beyond that Party’s reasonable control, including natural disaster, war, civil unrest, act of government, or failure of internet or telecommunications infrastructure.',
    ],
  },
  {
    heading: '18. Eligibility and Capacity to Contract',
    paragraphs: [
      'By signing this Agreement, the Partner represents that they are at least eighteen (18) years of age, or the age of majority in their jurisdiction if higher, and have full legal capacity to enter into a binding agreement. Where the Partner does not meet this requirement, this Agreement must additionally be countersigned by a parent or legal guardian before it takes effect.',
    ],
  },
  {
    heading: '19. Compliance with Laws',
    paragraphs: [
      'The Partner shall comply with all laws applicable to their activities under this Agreement, including anti-bribery and anti-corruption laws, and shall not offer, give, solicit or accept any improper payment or benefit in connection with referring students or Content Creators to AIIT.',
    ],
  },
  {
    heading: '20. General Provisions',
    paragraphs: [
      '20.1 Non-Exclusivity. This Agreement is non-exclusive. AIIT may appoint other partners, and the Partner may promote other programmes, provided there is no conflict of interest or misuse of AIIT materials.',
      '20.2 Independent Contractor. The Partner is an independent contractor and not an employee, agent, or legal representative of AIIT. The Partner has no authority to bind AIIT.',
      '20.3 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of Nigeria and the laws of India. The Parties shall first attempt to resolve any dispute amicably. Failing resolution within thirty (30) days, disputes may be referred to the competent courts in Port Harcourt, Rivers State, Nigeria, or Coimbatore, Tamil Nadu, India, as the Parties may mutually agree or as appropriate to the nature of the dispute.',
      '20.4 Assignment. The Partner may not assign or transfer this Agreement, or any rights or obligations under it, without AIIT’s prior written consent. AIIT may assign this Agreement in connection with a merger, reorganisation, or sale of substantially all of its relevant assets.',
      '20.5 Severability. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
      '20.6 Notices. Official notices under this Agreement shall be sent to the email addresses on record for each Party, and are deemed received on the next business day after sending.',
      '20.7 Entire Agreement. This document (including the applicant’s submitted application details and signature) constitutes the entire agreement between the Parties concerning the subject matter and supersedes prior discussions relating thereto. Amendments must be in writing and signed by both Parties.',
      '20.8 Counterparts. This Agreement may be executed in counterparts, including electronically, each of which shall be deemed an original.',
      '20.9 Survival. Clauses 10 (Confidentiality), 11 (Intellectual Property), 15 (Limitation of Liability), 16 (Indemnification) and 20.3 (Governing Law) survive termination of this Agreement.',
    ],
  },
  {
    heading: '21. Electronic Signature and Consent to Electronic Records',
    paragraphs: [
      'The Partner expressly consents to execute this Agreement electronically, by typing their full legal name and affirmatively checking the agreement box on the AIIT affiliate application form, and agrees that doing so has the same legal effect as a handwritten signature under applicable law, including the United States Electronic Signatures in Global and National Commerce (ESIGN) Act and Uniform Electronic Transactions Act (UETA), India’s Information Technology Act 2000, and Nigeria’s applicable electronic transactions framework.',
      'The Partner further consents to receive this Agreement, any amendments, and related notices electronically, at the email address provided on the application.',
    ],
  },
];
