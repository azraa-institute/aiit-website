/**
 * The affiliate program: self-service application + admin-screened
 * approval, then a personal referral link. See
 * apps/api/src/modules/affiliates and apps/api/src/modules/admin
 * (admin-affiliates.service.ts). Deliberately NOT a Profile.role value --
 * see the schema.prisma comment on the Affiliate model.
 */

export type AffiliateType = 'creator' | 'student' | 'affiliate_to_affiliate';
export type AffiliateApplicationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type AffiliatePayoutMethod = 'paypal' | 'bank';

/**
 * Computed server-side (AffiliatesService.computeEarnings()), from the same
 * published rates as apps/web/src/data/blueprint.ts's AFFILIATE.rates ($7/
 * direct referral, rising to $10 past 500; $5/creator-introduced referral).
 * `estimatedCents` is null for an 'affiliate_to_affiliate' type -- no rate
 * for that has ever been published, so this deliberately doesn't invent
 * one; the dashboard shows the referral count only in that case.
 */
export interface AffiliateEarnings {
  estimatedCents: number | null;
  paidCents: number;
  /** estimatedCents - paidCents; null whenever estimatedCents is null. */
  owedCents: number | null;
  currency: string;
}

/** Self-reported, admin-visible only -- never used to move money automatically. See Affiliate.payoutMethod's schema comment. */
export interface AffiliatePayoutInput {
  method: AffiliatePayoutMethod;
  paypalEmail?: string;
  bankCountry?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  /** Generic on purpose -- IFSC, sort code, routing number, SWIFT/BIC, whichever the affiliate's own bank uses. */
  bankCode?: string;
}

export interface AffiliatePayoutDetails extends AffiliatePayoutInput {
  updatedAt: string;
}

/** One manually-recorded payout (admin-entered after actually sending it) -- see AffiliatePayout in schema.prisma. */
export interface AffiliatePayoutRecord {
  id: string;
  amountCents: number;
  currency: string;
  note: string | null;
  paidAt: string;
  recordedByName: string | null;
}

/** What the applicant's own dashboard (GET /affiliates/me) sees. */
export interface AffiliateMe {
  hasApplied: boolean;
  type: AffiliateType | null;
  applicationStatus: AffiliateApplicationStatus | null;
  rejectionReason: string | null;
  /** True once the applicant has entered their reference code -- see AffiliatesService.activate(). Meaningless until applicationStatus is 'approved'. */
  activated: boolean;
  /** Only set once applicationStatus is 'approved' AND activated is true. */
  referralLink: string | null;
  registrationCount: number | null;
  earnings: AffiliateEarnings | null;
  payoutDetails: AffiliatePayoutDetails | null;
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
  state: string | null;
  city: string | null;
  source: string | null;
  motivation: string | null;
  /** Electronic signature evidence -- see Affiliate.signedName/signedAt and affiliate-agreement.ts. Null for the handful of rows that predate e-signature. */
  signedName: string | null;
  signedAt: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  earnings: AffiliateEarnings;
  payoutDetails: AffiliatePayoutDetails | null;
  payouts: AffiliatePayoutRecord[];
}

/** Response to POST /admin/affiliates (manually adding someone who already has a relationship with AIIT outside the public application form). */
export interface AdminAffiliateCredentials {
  affiliate: AdminAffiliateDetail;
  temporaryPassword: string;
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
