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
 * One referral pool's contribution to AffiliateEarnings -- either the
 * shared creator/student referral-link pool, or the affiliate-to-affiliate
 * coupon pool. `totalCount` is every referral ever attributed (raw
 * signups); `eligibleCount` is the subset that's actually "fully
 * onboarded" (see AffiliatesService.countOnboardedReferrals()/
 * countSuccessfulAffiliateReferrals()) and therefore what estimatedCents
 * is computed from.
 */
export interface AffiliateReferralBucket {
  totalCount: number;
  eligibleCount: number;
  estimatedCents: number;
}

/**
 * Computed server-side (AffiliatesService.computeEarnings()), from the same
 * published rates as apps/web/src/data/blueprint.ts's AFFILIATE.rates:
 * $7/onboarded direct student referral (rising to $10 past 500 --
 * escalation applies ONLY to this rate), $5/onboarded creator-introduced
 * referral (flat, no escalation), $2.50/successful affiliate-to-affiliate
 * referral (flat, no escalation). "Onboarded"/"successful" both mean the
 * referred person has a paid Order -- for affiliate-to-affiliate, the
 * referred affiliate must have onboarded a paying student of their own.
 * Each bucket is null when the affiliate doesn't hold a type that pool
 * applies to (e.g. affiliateReferrals is null unless `types` includes
 * 'affiliate_to_affiliate').
 */
export interface AffiliateEarnings {
  studentReferrals: AffiliateReferralBucket | null;
  affiliateReferrals: AffiliateReferralBucket | null;
  estimatedCents: number;
  paidCents: number;
  owedCents: number;
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
  types: AffiliateType[];
  applicationStatus: AffiliateApplicationStatus | null;
  rejectionReason: string | null;
  /** True once the applicant has entered their reference code -- see AffiliatesService.activate(). Meaningless until applicationStatus is 'approved'. */
  activated: boolean;
  /** Only set once applicationStatus is 'approved' AND activated is true, AND `types` includes 'student' or 'creator'. */
  referralLink: string | null;
  /** The exact heading the dashboard/link page should show above referralLink -- 'student' wins over 'creator' when both are held, since they share one link/pool. Null whenever referralLink is null. */
  studentReferralLinkLabel: 'Direct Student Referral Link' | 'Creator Referral Link' | null;
  /** The same referralSlug as referralLink, surfaced as a bare code instead of a URL -- only set once approved+activated AND `types` includes 'affiliate_to_affiliate'. Typed into another applicant's form, not clicked. */
  affiliateCouponCode: string | null;
  /** Raw signups via referralLink, regardless of payment -- unchanged meaning from before this was multi-type. Null unless approved. */
  registrationCount: number | null;
  /** Raw count of other affiliates who applied using this affiliate's coupon code, regardless of their own status/onboarding. Null unless approved. */
  affiliateReferralCount: number | null;
  earnings: AffiliateEarnings | null;
  payoutDetails: AffiliatePayoutDetails | null;
  /** Their own payout history -- same ledger the admin sees, for transparency. */
  payouts: AffiliatePayoutRecord[];
  /** The context collected at application time -- editable on the Settings page (PUT /affiliates/me/contact). */
  phone: string | null;
  handle: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  motivation: string | null;
}

export interface AdminAffiliateSummary {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  types: AffiliateType[];
  applicationStatus: AffiliateApplicationStatus;
  registrationCount: number;
  /** Raw count of other affiliates who applied using this affiliate's coupon code -- same metric as AffiliateMe.affiliateReferralCount, surfaced to admin regardless of approval status. */
  affiliateReferralCount: number;
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
  /** Same values an affiliate sees on their own dashboard/link page, surfaced to admin so support can see exactly what each affiliate holds -- see AffiliateMe's matching fields. Gated the same way: non-null only once applicationStatus is 'approved' and activatedAt is set. */
  referralLink: string | null;
  studentReferralLinkLabel: 'Direct Student Referral Link' | 'Creator Referral Link' | null;
  affiliateCouponCode: string | null;
  /** Not gated on approval/activation, unlike the two fields above -- admin needs to see this is pending even before the applicant has used it. */
  referenceCode: string | null;
  activatedAt: string | null;
  /** Set if this affiliate applied using another affiliate's coupon code -- who referred them, resolved for display (not just the raw id). Null if they didn't arrive via one. */
  referredBy: { id: string; name: string | null; email: string | null } | null;
}

/** USD -> currency multipliers (not a resolved price) -- lets the admin UI show a dollar figure alongside a couple of local currencies at once. See CurrencyService.getRates(). */
export interface AdminFxRates {
  rates: Record<string, number>;
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
