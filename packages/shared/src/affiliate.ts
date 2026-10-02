/**
 * The affiliate program: self-service application + admin-screened
 * approval, then a personal referral link. See
 * apps/api/src/modules/affiliates and apps/api/src/modules/admin
 * (admin-affiliates.service.ts). Deliberately NOT a Profile.role value --
 * see the schema.prisma comment on the Affiliate model.
 */

export type AffiliateType = 'creator' | 'student' | 'affiliate_to_affiliate';
export type AffiliateApplicationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

/** What the applicant's own dashboard (GET /affiliates/me) sees. */
export interface AffiliateMe {
  hasApplied: boolean;
  type: AffiliateType | null;
  applicationStatus: AffiliateApplicationStatus | null;
  rejectionReason: string | null;
  /** Only set once applicationStatus is 'approved'. */
  referralLink: string | null;
  registrationCount: number | null;
}

export interface AdminAffiliateSummary {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  type: AffiliateType;
  applicationStatus: AffiliateApplicationStatus;
  registrationCount: number;
  createdAt: string;
}

export interface AdminAffiliateStats {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  /** Across every approved affiliate's referral link, combined. */
  totalRegistrations: number;
}

export interface AdminAffiliateDetail extends AdminAffiliateSummary {
  phone: string | null;
  handle: string | null;
  country: string | null;
  city: string | null;
  source: string | null;
  motivation: string | null;
  /** Electronic signature evidence -- see Affiliate.signedName/signedAt and affiliate-agreement.ts. Null for the handful of rows that predate e-signature. */
  signedName: string | null;
  signedAt: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

/** The Affiliate Agreement's legal text, fetched fresh from GET /affiliates/agreement -- see apps/api/src/modules/affiliates/affiliate-agreement.ts for the single source of truth this mirrors. */
export interface AffiliateAgreementSection {
  heading: string;
  paragraphs: string[];
}

export interface AffiliateAgreement {
  version: string;
  sections: AffiliateAgreementSection[];
}
