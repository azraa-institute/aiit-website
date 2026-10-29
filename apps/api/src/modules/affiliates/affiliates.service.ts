import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type Affiliate } from '@prisma/client';
import type { AffiliateApplicationStatus, AffiliateEarnings, AffiliateMe, AffiliatePayoutDetails, AffiliatePayoutInput, AffiliateSocialLink, AffiliateType } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';
import { SupabaseAdminService, generateTemporaryPassword } from '../../common/supabase-admin/supabase-admin.service';
import { YoutubeClientService } from '../../common/youtube/youtube-client.service';
import { BrevoClientService } from '../../common/brevo/brevo-client.service';
import { AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';
import type { ApplyNewAffiliateDto } from './dto/apply-new-affiliate.dto';

export interface ApplyContext {
  phone?: string;
  handle?: string;
  country?: string;
  state?: string;
  city?: string;
  source?: string;
  motivation?: string;
  socialLinks?: AffiliateSocialLink[];
}

/** Prisma's Json column round-trips as `JsonValue` -- this is just that cast, with "missing/not an array" normalized to `[]` rather than left as `null`/`undefined` for every caller to handle. */
export function normalizeSocialLinks(value: Prisma.JsonValue | null): AffiliateSocialLink[] {
  return Array.isArray(value) ? (value as unknown as AffiliateSocialLink[]) : [];
}

/** Duck-typed against AdminCreateAffiliateDto (apps/api/src/modules/admin/admin-affiliates.controller.ts) -- kept as a plain interface here, same precedent as ApplyContext above, so this module doesn't import from the admin module. */
export interface AdminCreateAffiliateInput extends ApplyContext {
  name: string;
  email: string;
  types: AffiliateType[];
  status?: AffiliateApplicationStatus;
}

const EMPTY_ME: AffiliateMe = {
  hasApplied: false,
  types: [],
  applicationStatus: null,
  rejectionReason: null,
  activated: false,
  referralLink: null,
  studentReferralLinkLabel: null,
  affiliateCouponCode: null,
  registrationCount: null,
  affiliateReferralCount: null,
  earnings: null,
  payoutDetails: null,
  payouts: [],
  phone: null,
  handle: null,
  country: null,
  state: null,
  city: null,
  motivation: null,
  socialLinks: [],
};

// Published on the public site (apps/web/src/data/blueprint.ts's
// AFFILIATE.rates) -- the backend is the authoritative source for the
// actual dollar math, so these live here, not derived from that
// frontend-only marketing copy. Keep the two in sync by hand if pricing
// ever changes. Only the direct-student rate escalates after a volume
// milestone -- creator and affiliate-to-affiliate are both flat, forever,
// confirmed explicitly by the project owner.
const DIRECT_REFERRAL_RATE_CENTS = 700;
const DIRECT_REFERRAL_MILESTONE = 500;
const DIRECT_REFERRAL_MILESTONE_RATE_CENTS = 1000;
const CREATOR_REFERRAL_RATE_CENTS = 500;
const AFFILIATE_REFERRAL_RATE_CENTS = 250;

/** First `milestone` units at `baseRate`, every unit after that at `milestoneRate`. Used only for the direct-student rate -- the one rate that escalates. */
function tieredCents(count: number, baseRate: number, milestone: number, milestoneRate: number): number {
  if (count <= milestone) return count * baseRate;
  return milestone * baseRate + (count - milestone) * milestoneRate;
}

/**
 * Distinct profiles this affiliate referred (Profile.referredByAffiliateId)
 * who have "fully onboarded" -- i.e. have at least one paid Order. Raw SQL
 * because Order.userId/Profile.id have no Prisma relation between them
 * (same reason namesAndEmails() below already uses raw SQL in this file).
 */
export async function countOnboardedReferrals(prisma: PrismaService, affiliateId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT p.id)::bigint AS count
    FROM profiles p
    WHERE p.referred_by_affiliate_id = ${affiliateId}::uuid
      AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = p.id AND o.status = 'paid')`;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Distinct affiliates this affiliate referred (Affiliate.referredByAffiliateId,
 * set when the referred affiliate applied with this affiliate's coupon
 * code) who are approved AND have themselves onboarded at least one paying
 * student of their own (countOnboardedReferrals() on *their* id) -- the
 * project owner's explicit "the affiliate must have onboarded a student"
 * rule for what makes an affiliate-to-affiliate referral "successful".
 */
export async function countSuccessfulAffiliateReferrals(prisma: PrismaService, affiliateId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT a2.id)::bigint AS count
    FROM affiliates a2
    WHERE a2.referred_by_affiliate_id = ${affiliateId}::uuid
      AND a2.application_status = 'approved'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.referred_by_affiliate_id = a2.id
          AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = p.id AND o.status = 'paid')
      )`;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Shared by AffiliatesService.toMe() and AdminAffiliatesService.detail() so
 * the affiliate's own dashboard and the admin's view of them always agree
 * on the same numbers. Builds one bucket per pool the affiliate's `types`
 * makes them eligible for and sums them -- see AffiliateEarnings' own doc
 * comment in packages/shared for the exact rates.
 */
export async function computeEarnings(prisma: PrismaService, affiliate: Affiliate): Promise<AffiliateEarnings> {
  const hasStudent = affiliate.types.includes('student');
  const hasCreator = affiliate.types.includes('creator');
  const hasAffiliateToAffiliate = affiliate.types.includes('affiliate_to_affiliate');

  const [registrationCount, onboardedCount, affiliateReferralCount, successfulAffiliateReferralCount, paid] = await Promise.all([
    hasStudent || hasCreator ? prisma.profile.count({ where: { referredByAffiliateId: affiliate.id } }) : Promise.resolve(0),
    hasStudent || hasCreator ? countOnboardedReferrals(prisma, affiliate.id) : Promise.resolve(0),
    hasAffiliateToAffiliate ? prisma.affiliate.count({ where: { referredByAffiliateId: affiliate.id } }) : Promise.resolve(0),
    hasAffiliateToAffiliate ? countSuccessfulAffiliateReferrals(prisma, affiliate.id) : Promise.resolve(0),
    prisma.affiliatePayout.aggregate({ where: { affiliateId: affiliate.id }, _sum: { amountCents: true } }),
  ]);

  const studentReferrals =
    hasStudent || hasCreator
      ? {
          totalCount: registrationCount,
          eligibleCount: onboardedCount,
          // 'student' (direct) takes priority over 'creator' when both are held -- same shared link/pool, see the design note in the plan/memory.
          estimatedCents: hasStudent
            ? tieredCents(onboardedCount, DIRECT_REFERRAL_RATE_CENTS, DIRECT_REFERRAL_MILESTONE, DIRECT_REFERRAL_MILESTONE_RATE_CENTS)
            : onboardedCount * CREATOR_REFERRAL_RATE_CENTS,
        }
      : null;

  const affiliateReferrals = hasAffiliateToAffiliate
    ? {
        totalCount: affiliateReferralCount,
        eligibleCount: successfulAffiliateReferralCount,
        estimatedCents: successfulAffiliateReferralCount * AFFILIATE_REFERRAL_RATE_CENTS,
      }
    : null;

  const estimatedCents = (studentReferrals?.estimatedCents ?? 0) + (affiliateReferrals?.estimatedCents ?? 0);
  const paidCents = paid._sum.amountCents ?? 0;
  return {
    studentReferrals,
    affiliateReferrals,
    estimatedCents,
    paidCents,
    owedCents: estimatedCents - paidCents,
    currency: 'USD',
  };
}

/** 'student' wins over 'creator' when both are held -- they share one referral link/pool, see computeEarnings()'s matching comment. Null if neither is held. Exported for AdminAffiliatesService.detail() to compute the identical label admin sees. */
export function studentReferralLinkLabel(types: AffiliateType[]): 'Direct Student Referral Link' | 'Creator Referral Link' | null {
  if (types.includes('student')) return 'Direct Student Referral Link';
  if (types.includes('creator')) return 'Creator Referral Link';
  return null;
}

/**
 * Self-service affiliate application + the applicant's own status view.
 * Deliberately not role-gated (no @Roles here) -- any signed-in account can
 * apply, including an existing learner, and affiliate-ness is tracked by
 * whether an Affiliate row exists for this user, not by their Profile.role.
 * See the schema.prisma comment on the Affiliate model for why.
 */
@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly supabase: SupabaseAdminService,
    private readonly youtube: YoutubeClientService,
    private readonly brevo: BrevoClientService,
  ) {}

  /** An already-logged-in account applying -- no password to issue, they already have one. */
  async apply(
    userId: string,
    types: AffiliateType[],
    signedName: string,
    signedIp: string | undefined,
    context: ApplyContext = {},
    affiliateCouponCode?: string,
  ): Promise<AffiliateMe> {
    const affiliate = await this.createRow(userId, types, signedName, signedIp, context, affiliateCouponCode);
    await this.audit.record(userId, 'affiliate.apply', 'affiliate', affiliate.id, { types });
    this.enrichInBackground(affiliate, types);
    return this.toMe(affiliate);
  }

  /**
   * A brand-new, anonymous applicant -- no session, no password of their
   * own choosing. Creates the Supabase account server-side (pre-confirmed,
   * via the admin API -- no email-confirmation-link detour) with a random
   * one-time password, flags it mustChangePassword. Mirrors
   * AdminUsersService.createInstructor()'s shape -- same "upsert the
   * Profile the on_auth_user_created trigger already inserted" pattern.
   * If they arrived via a /r/:slug referral link, dto.referralSlug carries
   * that through to the trigger too (as `referral_slug` in Supabase's own
   * user_metadata), the same way RegisterPage.tsx's client-side signUp()
   * already does -- so the new Profile.referredByAffiliateId still gets
   * set even though this account is created server-side, not via the
   * client signUp() path.
   *
   * The temporary password generated here is used once (to create the
   * account) and then discarded -- it is deliberately never emailed. Real
   * login credentials only go out once an admin approves the application
   * (see AdminAffiliatesService.notifyApplicant()), which regenerates a
   * fresh password at that point via SupabaseAdminService.setPassword(),
   * the same method AdminUsersService.resetInstructorPassword() already
   * uses for staff. This applicant only gets an acknowledgment email here.
   */
  async applyNew(dto: ApplyNewAffiliateDto, signedIp: string | undefined): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const password = generateTemporaryPassword();
    const referralSlug = dto.referralSlug?.trim();
    const userId = await this.supabase.createUser(
      email,
      password,
      name,
      referralSlug ? { referral_slug: referralSlug } : undefined,
      signedIp,
    );

    await this.prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, name, mustChangePassword: true },
      update: { name, mustChangePassword: true },
    });

    const { types, signedName, phone, handle, country, state, city, source, motivation, affiliateCouponCode, socialLinks } = dto;
    const affiliate = await this.createRow(
      userId,
      types,
      signedName,
      signedIp,
      { phone, handle, country, state, city, source, motivation, socialLinks },
      affiliateCouponCode,
    );
    await this.audit.record(userId, 'affiliate.apply_new', 'affiliate', affiliate.id, { types, email });
    this.enrichInBackground(affiliate, types, { name, email });

    await this.email.send({
      to: email,
      subject: 'Your AIIT affiliate application is in',
      html: brandedEmailHtml({
        heading: 'Your application is in',
        intro:
          "Thanks for applying to the AIIT affiliate program. We're reviewing it now -- you'll get another email with your login details as soon as it's approved.",
        ctaLabel: 'Visit AIIT',
        ctaUrl: webOrigin(),
        footerNote: "You're receiving this because you applied to the AIIT affiliate program.",
      }),
    });
  }

  /**
   * Admin-initiated, for someone AIIT already has a relationship with
   * outside the public application form (an existing partner/creator who
   * agreed to terms some other way) -- mirrors applyNew()'s account
   * creation half (temp password, mustChangePassword, emailed credentials),
   * but deliberately does NOT fabricate e-signature evidence: signedName/
   * agreementVersion/signedAt/signedIp stay null here, same as the
   * handful of pre-e-signature rows the schema comment already describes,
   * since nothing was actually typed/consented-to through this form.
   * Defaults to 'approved' (not the public flow's 'pending') -- the whole
   * point of this path is onboarding someone who shouldn't sit in the
   * review queue; the admin can still set 'pending' explicitly.
   */
  async createManually(adminId: string, dto: AdminCreateAffiliateInput, adminIp: string | undefined): Promise<{ affiliate: Affiliate; temporaryPassword: string }> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const password = generateTemporaryPassword();
    const userId = await this.supabase.createUser(email, password, name, undefined, adminIp);

    await this.prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, name, mustChangePassword: true, createdBy: adminId },
      update: { name, mustChangePassword: true },
    });

    const status = dto.status ?? 'approved';
    const terminal = status === 'approved' || status === 'rejected';
    const affiliate = await this.prisma.affiliate
      .create({
        data: {
          userId,
          types: dto.types,
          referralSlug: generateReferralSlug(),
          referenceCode: generateReferenceCode(),
          applicationStatus: status,
          reviewedAt: terminal ? new Date() : null,
          reviewedBy: terminal ? adminId : null,
          phone: dto.phone,
          handle: dto.handle,
          country: dto.country,
          state: dto.state,
          city: dto.city,
          source: dto.source ?? 'Added manually by an admin',
          motivation: dto.motivation,
        },
      })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('This person already has an affiliate record.');
        }
        throw err;
      });
    await this.audit.record(adminId, 'affiliate.create_manual', 'affiliate', affiliate.id, { types: dto.types, email, status });

    // See applyNew()'s matching comment on why credentials are withheld
    // until approval -- createManually() defaults to 'approved' (the whole
    // point of this path is skipping the review queue), so the common
    // case still emails credentials immediately. Only the rare explicit
    // non-terminal status an admin can still choose on this form holds
    // them back, the same as the public application flow does.
    const portalUrl = `${webOrigin()}/affiliate-portal`;
    if (status === 'approved') {
      await this.email.send({
        to: email,
        subject: 'Your AIIT affiliate account is ready',
        html: brandedEmailHtml({
          heading: 'Your AIIT affiliate account is ready',
          intro:
            "An AIIT administrator added you to the affiliate program. Use the temporary password below to sign in -- you'll be asked to set your own password right away.",
          bodyHtml: credentialsBlockHtml([
            { label: 'Email', value: email },
            { label: 'Temporary password', value: password },
            { label: 'Reference code', value: affiliate.referenceCode ?? '' },
          ]),
          ctaLabel: 'Log in to AIIT',
          ctaUrl: portalUrl,
          footerNote: "You're receiving this because an AIIT administrator added you to the affiliate program. Keep your reference code -- you'll use it to activate your referral link.",
        }),
      });
    } else {
      await this.email.send({
        to: email,
        subject: 'Your AIIT affiliate application is in',
        html: brandedEmailHtml({
          heading: 'Your application is in',
          intro: "An AIIT administrator added you to the affiliate program. We're finishing your review now -- you'll get another email with your login details as soon as it's approved.",
          ctaLabel: 'Visit AIIT',
          ctaUrl: webOrigin(),
          footerNote: "You're receiving this because an AIIT administrator added you to the affiliate program.",
        }),
      });
    }

    return { affiliate, temporaryPassword: password };
  }

  async me(userId: string): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) return EMPTY_ME;
    return this.toMe(affiliate);
  }

  /** The caller's own signed record, for regenerating their agreement PDF on demand (GET /affiliates/me/agreement.pdf). */
  async getOwnSignedRecord(userId: string): Promise<Affiliate> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate?.signedAt) throw new NotFoundException('No signed agreement found for your account.');
    return affiliate;
  }

  /** Unlocks the referral link -- see the Affiliate.referenceCode/activatedAt schema comment. */
  async activate(userId: string, referenceCode: string): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found for your account.');
    if (affiliate.activatedAt) return this.toMe(affiliate);
    if (!affiliate.referenceCode || affiliate.referenceCode !== referenceCode.trim().toUpperCase()) {
      throw new BadRequestException('That reference code doesn’t match. Check the email we sent you and try again.');
    }
    const updated = await this.prisma.affiliate.update({ where: { userId }, data: { activatedAt: new Date() } });
    await this.audit.record(userId, 'affiliate.activate', 'affiliate', affiliate.id, {});
    return this.toMe(updated);
  }

  /** Re-sends the same stored code (never regenerates it -- a code already emailed must stay valid). */
  async resendReferenceCode(userId: string): Promise<void> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate?.referenceCode) throw new NotFoundException('No affiliate application found for your account.');
    const email = (await this.namesAndEmails([userId])).get(userId)?.email;
    if (!email) throw new NotFoundException('Could not find an email address for your account.');
    await this.email.send({
      to: email,
      subject: 'Your AIIT affiliate reference code',
      html: brandedEmailHtml({
        heading: 'Your reference code',
        intro: 'Here’s the reference code for your AIIT affiliate application, to activate your referral link once it’s approved.',
        bodyHtml: credentialsBlockHtml([{ label: 'Reference code', value: affiliate.referenceCode }]),
        ctaLabel: 'Open your affiliate dashboard',
        ctaUrl: `${webOrigin()}/affiliate-portal`,
        footerNote: "You're receiving this because you asked to resend your AIIT affiliate reference code.",
      }),
    });
  }

  private async createRow(
    userId: string,
    types: AffiliateType[],
    signedName: string,
    signedIp: string | undefined,
    context: ApplyContext,
    affiliateCouponCode?: string,
  ): Promise<Affiliate> {
    if (types.length === 0) throw new BadRequestException('Select at least one affiliate type.');
    const referredByAffiliateId = await this.resolveAffiliateCouponCode(affiliateCouponCode);
    const { socialLinks, ...rest } = context;
    return this.prisma.affiliate
      .create({
        data: {
          userId,
          types,
          referralSlug: generateReferralSlug(),
          referenceCode: generateReferenceCode(),
          signedName: signedName.trim(),
          signedIp: signedIp ?? null,
          agreementVersion: AFFILIATE_AGREEMENT_VERSION,
          signedAt: new Date(),
          referredByAffiliateId,
          ...rest,
          socialLinks: socialLinks ? (socialLinks as unknown as Prisma.InputJsonValue) : undefined,
        },
      })
      .catch((err: unknown) => {
        // Either this user already has a row, or (astronomically less likely) the
        // random slug/reference code collided -- either way it's a conflict the
        // caller should see as "you've already applied" rather than a 500.
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('You have already applied to the affiliate program.');
        }
        throw err;
      });
  }

  /**
   * An affiliate-to-affiliate "coupon code" is just another affiliate's
   * own referralSlug, typed in rather than clicked (see the
   * studentReferralLinkLabel/affiliateCouponCode doc comments in
   * packages/shared -- same slug, two presentations). Case-insensitive,
   * same convention as activate()'s reference-code match. Undefined/empty
   * input is a no-op (most applicants don't have one); a non-empty input
   * that matches nothing is a real input error, not silently ignored.
   */
  private async resolveAffiliateCouponCode(code: string | undefined): Promise<string | null> {
    const normalized = code?.trim().toLowerCase();
    if (!normalized) return null;
    const referrer = await this.prisma.affiliate.findUnique({ where: { referralSlug: normalized } });
    if (!referrer) throw new BadRequestException('That coupon code doesn’t match any affiliate. Check it and try again.');
    return referrer.id;
  }

  /** Same raw-SQL lookup admin-affiliates.service.ts uses -- auth.users isn't a Prisma model, so email only ever comes from a direct query against it. */
  private async namesAndEmails(userIds: string[]): Promise<Map<string, { name: string | null; email: string | null }>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const [profiles, emails] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
        SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(unique.map((i) => Prisma.sql`${i}::uuid`))})`,
    ]);
    const emailById = new Map(emails.map((e) => [e.id, e.email]));
    return new Map(profiles.map((p) => [p.id, { name: p.name, email: emailById.get(p.id) ?? null }]));
  }

  private async toMe(affiliate: Affiliate): Promise<AffiliateMe> {
    const approved = affiliate.applicationStatus === 'approved';
    const activated = Boolean(affiliate.activatedAt);
    const unlocked = approved && activated;
    const [registrationCount, affiliateReferralCount] = approved
      ? await Promise.all([
          this.prisma.profile.count({ where: { referredByAffiliateId: affiliate.id } }),
          this.prisma.affiliate.count({ where: { referredByAffiliateId: affiliate.id } }),
        ])
      : [null, null];
    const payoutRows = await this.prisma.affiliatePayout.findMany({ where: { affiliateId: affiliate.id }, orderBy: { paidAt: 'desc' } });
    return {
      hasApplied: true,
      types: affiliate.types,
      applicationStatus: affiliate.applicationStatus,
      rejectionReason: affiliate.rejectionReason,
      activated,
      referralLink: unlocked && studentReferralLinkLabel(affiliate.types) ? `${webOrigin()}/r/${affiliate.referralSlug}` : null,
      studentReferralLinkLabel: unlocked ? studentReferralLinkLabel(affiliate.types) : null,
      affiliateCouponCode: unlocked && affiliate.types.includes('affiliate_to_affiliate') ? affiliate.referralSlug.toUpperCase() : null,
      registrationCount,
      affiliateReferralCount,
      earnings: approved ? await computeEarnings(this.prisma, affiliate) : null,
      payoutDetails: payoutDetailsFrom(affiliate),
      // recordedByName (which admin) is deliberately omitted here -- that's
      // internal admin-side detail, not something the affiliate needs.
      payouts: payoutRows.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        currency: p.currency,
        note: p.note,
        paidAt: p.paidAt.toISOString(),
        recordedByName: null,
      })),
      phone: affiliate.phone,
      handle: affiliate.handle,
      country: affiliate.country,
      state: affiliate.state,
      city: affiliate.city,
      motivation: affiliate.motivation,
      socialLinks: normalizeSocialLinks(affiliate.socialLinks),
    };
  }

  /**
   * Fires the YouTube-verification + Brevo-sync enrichment without
   * blocking the caller's response -- a slow/down third party must never
   * delay an application submission. Errors are logged, never rethrown;
   * there's no queue backing this (a fetch in flight during a process
   * restart is simply lost), an accepted tradeoff for a non-critical
   * enrichment signal the admin can always check by hand.
   */
  private enrichInBackground(affiliate: Affiliate, types: AffiliateType[], identity?: { name: string; email: string }): void {
    const socialLinks = normalizeSocialLinks(affiliate.socialLinks);
    void Promise.all([this.verifyYoutubeFollowers(affiliate.id, socialLinks), this.syncToBrevo(affiliate, types, socialLinks, identity)]).catch((err) =>
      this.logger.warn(`Affiliate enrichment failed for ${affiliate.id}: ${(err as Error).message}`),
    );
  }

  /**
   * Best-effort: re-fetches each YouTube entry's real subscriber count and
   * patches it back into the JSON array. Every other platform's entries
   * are left as self-reported only (fetchStatus: 'unsupported') -- see
   * YoutubeClientService's doc comment for why only YouTube gets a real
   * check.
   */
  private async verifyYoutubeFollowers(affiliateId: string, socialLinks: AffiliateSocialLink[]): Promise<void> {
    if (socialLinks.length === 0) return;
    const updated = await Promise.all(
      socialLinks.map(async (link): Promise<AffiliateSocialLink> => {
        if (link.platform !== 'youtube') return { ...link, fetchStatus: link.fetchStatus ?? 'unsupported' };
        const followersFetched = await this.youtube.fetchSubscriberCount(link.url);
        return {
          ...link,
          followersFetched,
          fetchStatus: followersFetched == null ? 'failed' : 'fetched',
          fetchedAt: new Date().toISOString(),
        };
      }),
    );
    await this.prisma.affiliate.update({ where: { id: affiliateId }, data: { socialLinks: updated as unknown as Prisma.InputJsonValue } });
  }

  /**
   * Pushes a privacy-minimal lead record to Brevo for the project owner's
   * own outreach -- every application, regardless of eventual outcome, no
   * status-based segmentation. Deliberately excludes phone/motivation/
   * signature evidence/payout details -- only what's needed for outreach.
   */
  private async syncToBrevo(affiliate: Affiliate, types: AffiliateType[], socialLinks: AffiliateSocialLink[], identity?: { name: string; email: string }): Promise<void> {
    let name = identity?.name ?? null;
    let email = identity?.email ?? null;
    if (!email) {
      const person = (await this.namesAndEmails([affiliate.userId])).get(affiliate.userId);
      name = person?.name ?? null;
      email = person?.email ?? null;
    }
    if (!email) return;
    const listId = process.env.BREVO_AFFILIATE_LIST_ID ? Number(process.env.BREVO_AFFILIATE_LIST_ID) : undefined;
    await this.brevo.upsertContact({
      email,
      attributes: {
        FIRSTNAME: name ?? '',
        COUNTRY: affiliate.country ?? '',
        APPLICATION_TYPES: types.join(', '),
        SOCIAL_LINKS: socialLinks.map((l) => `${l.platform}: ${l.url}`).join(' | '),
        FOLLOWERS_REPORTED_MAX: Math.max(0, ...socialLinks.map((l) => l.followersReported ?? 0)),
      },
      listIds: listId != null && !Number.isNaN(listId) ? [listId] : undefined,
    });
  }

  /**
   * Self-service: an affiliate submitting/updating where to send their
   * payout -- admin-visible only, never used to move money automatically
   * (see Affiliate.payoutMethod's schema comment). Tightly throttled at
   * the controller (this changes where real money gets sent) and the
   * submitting IP is captured in the audit entry, same forensic pattern
   * as the e-signature's signedIp, so a disputed change has a paper trail.
   */
  async updatePayoutDetails(userId: string, input: AffiliatePayoutInput, submittedIp: string | undefined): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found for your account.');
    const updated = await this.prisma.affiliate.update({
      where: { userId },
      data: {
        payoutMethod: input.method,
        payoutPaypalEmail: input.method === 'paypal' ? (input.paypalEmail?.trim() ?? null) : null,
        payoutBankCountry: input.method === 'bank' ? (input.bankCountry?.trim() ?? null) : null,
        payoutBankAccountName: input.method === 'bank' ? (input.bankAccountName?.trim() ?? null) : null,
        payoutBankAccountNumber: input.method === 'bank' ? (input.bankAccountNumber?.trim() ?? null) : null,
        payoutBankName: input.method === 'bank' ? (input.bankName?.trim() ?? null) : null,
        payoutBankCode: input.method === 'bank' ? (input.bankCode?.trim() ?? null) : null,
        payoutUpdatedAt: new Date(),
      },
    });
    const wasChange = Boolean(affiliate.payoutMethod);
    await this.audit.record(userId, wasChange ? 'affiliate.payout_details_changed' : 'affiliate.payout_details_added', 'affiliate', affiliate.id, {
      method: input.method,
      ip: submittedIp ?? null,
    });
    return this.toMe(updated);
  }

  /** Self-service edit of the context collected at application time -- circumstances change after applying. */
  async updateContactDetails(userId: string, input: ApplyContext): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found for your account.');
    const updated = await this.prisma.affiliate.update({
      where: { userId },
      data: {
        phone: input.phone?.trim() || null,
        handle: input.handle?.trim() || null,
        country: input.country?.trim() || null,
        state: input.state?.trim() || null,
        city: input.city?.trim() || null,
        motivation: input.motivation?.trim() || null,
      },
    });
    await this.audit.record(userId, 'affiliate.contact_updated', 'affiliate', affiliate.id, {});
    return this.toMe(updated);
  }
}

export function payoutDetailsFrom(affiliate: Affiliate): AffiliatePayoutDetails | null {
  if (!affiliate.payoutMethod || !affiliate.payoutUpdatedAt) return null;
  return {
    method: affiliate.payoutMethod,
    paypalEmail: affiliate.payoutPaypalEmail ?? undefined,
    bankCountry: affiliate.payoutBankCountry ?? undefined,
    bankAccountName: affiliate.payoutBankAccountName ?? undefined,
    bankAccountNumber: affiliate.payoutBankAccountNumber ?? undefined,
    bankName: affiliate.payoutBankName ?? undefined,
    bankCode: affiliate.payoutBankCode ?? undefined,
    updatedAt: affiliate.payoutUpdatedAt.toISOString(),
  };
}

function generateReferralSlug(): string {
  return randomBytes(5).toString('hex');
}

/** Short, typeable, visually distinct from the login password it's emailed alongside -- see the Affiliate.referenceCode schema comment. */
function generateReferenceCode(): string {
  return `AIIT-AFF-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export function webOrigin(): string {
  return process.env.APP_URL ?? 'https://aiit.network';
}

export function credentialsBlockHtml(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#55504a;">${label}</td>
          <td style="padding:8px 0;font-family:'Courier New',monospace;font-size:15px;font-weight:bold;color:#14110f;text-align:right;">${value}</td>
        </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe7;border:1px solid rgba(20,17,15,0.12);border-radius:6px;padding:4px 16px;">
      ${cells}
    </table>
  `;
}
