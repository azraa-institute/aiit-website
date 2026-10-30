import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Affiliate } from '@prisma/client';
import type {
  AdminAffiliateCredentials,
  AdminAffiliateDetail,
  AdminAffiliateStats,
  AdminAffiliateSummary,
  AffiliateApplicationStatus,
  AffiliatePayoutRecord,
  AffiliateType,
  Paginated,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';
import { SupabaseAdminService, generateTemporaryPassword } from '../../common/supabase-admin/supabase-admin.service';
import {
  AffiliatesService,
  computeEarnings,
  credentialsBlockHtml,
  normalizeSocialLinks,
  payoutDetailsFrom,
  studentReferralLinkLabel,
  webOrigin,
  type AdminCreateAffiliateInput,
} from '../affiliates/affiliates.service';

const PAGE_SIZE = 25;

interface ListQuery {
  status?: AffiliateApplicationStatus;
  type?: AffiliateType;
  q?: string;
  page?: number;
}

/** Admin screening for affiliate applications -- mirrors AdminComplaintsService's shape. */
@Injectable()
export class AdminAffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly affiliatesService: AffiliatesService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  async stats(): Promise<AdminAffiliateStats> {
    const [byStatus, totalRegistrations] = await Promise.all([
      this.prisma.affiliate.groupBy({ by: ['applicationStatus'], _count: { _all: true } }),
      this.prisma.profile.count({ where: { referredByAffiliateId: { not: null } } }),
    ]);
    const count = (status: AffiliateApplicationStatus) => byStatus.find((b) => b.applicationStatus === status)?._count._all ?? 0;
    return {
      total: byStatus.reduce((sum, b) => sum + b._count._all, 0),
      pending: count('pending'),
      inReview: count('in_review'),
      approved: count('approved'),
      rejected: count('rejected'),
      totalRegistrations,
    };
  }

  async list(query: ListQuery): Promise<Paginated<AdminAffiliateSummary>> {
    const page = query.page ?? 1;
    let userIdFilter: Prisma.StringFilter | undefined;
    if (query.q?.trim()) {
      const like = `%${query.q.trim().replace(/[%_\\]/g, '\\$&')}%`;
      const matches = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.name ILIKE ${like} OR u.email ILIKE ${like}`;
      userIdFilter = { in: matches.map((m) => m.id) };
    }
    const where: Prisma.AffiliateWhereInput = {
      ...(query.status ? { applicationStatus: query.status } : {}),
      // Array-contains, not equality -- one affiliate can now hold several
      // types, so "filter by type" means "has this type", not "is this type".
      ...(query.type ? { types: { has: query.type } } : {}),
      ...(userIdFilter ? { userId: userIdFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.affiliate.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      this.prisma.affiliate.count({ where }),
    ]);

    const [names, registrationCounts, affiliateReferralCounts] = await Promise.all([
      this.namesAndEmails(rows.map((r) => r.userId)),
      this.registrationCounts(rows.map((r) => r.id)),
      this.affiliateReferralCounts(rows.map((r) => r.id)),
    ]);
    return {
      items: rows.map((r) => this.toSummary(r, names, registrationCounts.get(r.id) ?? 0, affiliateReferralCounts.get(r.id) ?? 0)),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async detail(id: string): Promise<AdminAffiliateDetail> {
    const row = await this.prisma.affiliate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Affiliate application not found.');

    const [names, count, affiliateReferralCount, reviewerName, payoutRows, referredBy] = await Promise.all([
      this.namesAndEmails([row.userId]),
      this.prisma.profile.count({ where: { referredByAffiliateId: row.id } }),
      this.prisma.affiliate.count({ where: { referredByAffiliateId: row.id } }),
      row.reviewedBy ? this.namesAndEmails([row.reviewedBy]) : Promise.resolve(new Map()),
      this.prisma.affiliatePayout.findMany({ where: { affiliateId: row.id }, orderBy: { paidAt: 'desc' } }),
      this.referrerInfo(row.referredByAffiliateId),
    ]);
    // Unlike the affiliate's own dashboard (which hides stats until
    // approved, see AffiliatesService.toMe()), the admin view always shows
    // the real count/earnings -- screening isn't gated on approval status.
    const earnings = await computeEarnings(this.prisma, row);
    const payoutRecorders = await this.namesAndEmails(payoutRows.map((p) => p.recordedBy));
    const unlocked = row.applicationStatus === 'approved' && Boolean(row.activatedAt);
    const linkLabel = studentReferralLinkLabel(row.types);

    return {
      ...this.toSummary(row, names, count, affiliateReferralCount),
      phone: row.phone,
      handle: row.handle,
      country: row.country,
      state: row.state,
      city: row.city,
      signedName: row.signedName,
      signedAt: row.signedAt?.toISOString() ?? null,
      source: row.source,
      motivation: row.motivation,
      socialLinks: normalizeSocialLinks(row.socialLinks),
      rejectionReason: row.rejectionReason,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedByName: row.reviewedBy ? (reviewerName.get(row.reviewedBy)?.name ?? null) : null,
      earnings,
      payoutDetails: payoutDetailsFrom(row),
      payouts: payoutRows.map((p) => this.toPayoutRecord(p, payoutRecorders)),
      // Same values the affiliate sees on their own dashboard/link page --
      // see AdminAffiliateDetail's own doc comment in packages/shared.
      referralLink: unlocked && linkLabel ? `${webOrigin()}/r/${row.referralSlug}` : null,
      studentReferralLinkLabel: unlocked ? linkLabel : null,
      affiliateCouponCode: unlocked && row.types.includes('affiliate_to_affiliate') ? row.referralSlug.toUpperCase() : null,
      referenceCode: row.referenceCode,
      activatedAt: row.activatedAt?.toISOString() ?? null,
      referredBy,
    };
  }

  /** An admin recording a payout they already sent themselves (PayPal/bank transfer, outside this system) -- never moves money. */
  async recordPayout(adminId: string, affiliateId: string, amountCents: number, note: string | undefined): Promise<AdminAffiliateDetail> {
    const row = await this.prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!row) throw new NotFoundException('Affiliate application not found.');
    if (amountCents <= 0) throw new BadRequestException('Enter a payout amount greater than zero.');

    await this.prisma.affiliatePayout.create({
      data: { affiliateId, amountCents, note: note?.trim() || null, recordedBy: adminId },
    });
    await this.audit.record(adminId, 'affiliate.payout_recorded', 'affiliate', affiliateId, { amountCents });
    return this.detail(affiliateId);
  }

  private toPayoutRecord(p: Prisma.AffiliatePayoutGetPayload<Record<string, never>>, names: Map<string, { name: string | null; email: string | null }>): AffiliatePayoutRecord {
    return {
      id: p.id,
      amountCents: p.amountCents,
      currency: p.currency,
      note: p.note,
      paidAt: p.paidAt.toISOString(),
      recordedByName: names.get(p.recordedBy)?.name ?? null,
    };
  }

  async setStatus(adminId: string, id: string, status: AffiliateApplicationStatus, rejectionReason?: string): Promise<AdminAffiliateDetail> {
    const row = await this.prisma.affiliate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Affiliate application not found.');
    if (status === 'rejected' && !rejectionReason?.trim()) {
      throw new BadRequestException('Give a reason so the applicant understands the decision.');
    }

    const terminal = status === 'approved' || status === 'rejected';
    await this.prisma.affiliate.update({
      where: { id },
      data: {
        applicationStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason!.trim() : null,
        reviewedAt: terminal ? new Date() : null,
        reviewedBy: terminal ? adminId : null,
      },
    });

    if (terminal && row.applicationStatus !== status) {
      await this.notifyApplicant(row, status, rejectionReason);
    }
    await this.audit.record(adminId, 'affiliate.status', 'affiliate', id, { from: row.applicationStatus, to: status });
    return this.detail(id);
  }

  /** For someone AIIT already has a relationship with outside the public form -- see AffiliatesService.createManually()'s own doc comment for what this does and doesn't fabricate. */
  async createManually(adminId: string, dto: AdminCreateAffiliateInput, adminIp: string | undefined): Promise<AdminAffiliateCredentials> {
    const { affiliate, temporaryPassword } = await this.affiliatesService.createManually(adminId, dto, adminIp);
    return { affiliate: await this.detail(affiliate.id), temporaryPassword };
  }

  // ---- helpers ----

  /**
   * Approval is the only moment a public applicant (AffiliatesService.
   * applyNew()) actually receives working login credentials -- that
   * method deliberately only sends an acknowledgment email at submission
   * time, see its own doc comment. The original temp password generated
   * there was used once to create the account and then discarded, so
   * approval regenerates a fresh one via SupabaseAdminService.setPassword(),
   * the exact method AdminUsersService.resetInstructorPassword() already
   * uses for staff password resets -- not new API surface.
   */
  private async notifyApplicant(row: Affiliate, status: AffiliateApplicationStatus, rejectionReason?: string): Promise<void> {
    const approved = status === 'approved';
    const title = approved ? 'Your affiliate application was approved' : 'Your affiliate application was not approved';
    await this.prisma.notification.create({
      data: { userId: row.userId, kind: 'system', title, body: approved ? undefined : rejectionReason?.trim(), href: '/affiliate-portal' },
    });

    const email = (await this.namesAndEmails([row.userId])).get(row.userId)?.email;
    if (!email) return;
    const portalUrl = `${webOrigin()}/affiliate-portal`;

    if (approved) {
      const password = generateTemporaryPassword();
      await this.supabase.setPassword(row.userId, password);
      await this.email.send({
        to: email,
        subject: title,
        html: brandedEmailHtml({
          heading: title,
          intro:
            "You're approved. Here's what you need to sign in. You'll be asked to set your own password the moment you do. Your personal referral link and dashboard are ready whenever you are.",
          bodyHtml: credentialsBlockHtml([
            { label: 'Email', value: email },
            { label: 'Temporary password', value: password },
            { label: 'Reference code', value: row.referenceCode ?? '' },
          ]),
          ctaLabel: 'Log in to AIIT',
          ctaUrl: `${webOrigin()}/affiliate/login`,
          footerNote:
            "You're receiving this because you applied to the AIIT affiliate program. Keep your reference code; you'll use it to activate your referral link.",
        }),
      });
      return;
    }

    await this.email.send({
      to: email,
      subject: title,
      html: brandedEmailHtml({
        heading: title,
        intro: `We can't move forward with this application right now.${rejectionReason ? ` ${rejectionReason.trim()}` : ''}`,
        ctaLabel: 'Open your affiliate dashboard',
        ctaUrl: portalUrl,
        footerNote: "You're receiving this because you applied to the AIIT affiliate program.",
      }),
    });
  }

  private toSummary(
    row: Affiliate,
    names: Map<string, { name: string | null; email: string | null }>,
    registrationCount: number,
    affiliateReferralCount: number,
  ): AdminAffiliateSummary {
    const person = names.get(row.userId);
    return {
      id: row.id,
      userId: row.userId,
      name: person?.name ?? null,
      email: person?.email ?? null,
      types: row.types,
      applicationStatus: row.applicationStatus,
      registrationCount,
      affiliateReferralCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async namesAndEmails(ids: string[]): Promise<Map<string, { name: string | null; email: string | null }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const [profiles, emails] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
        SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(unique.map((i) => Prisma.sql`${i}::uuid`))})`,
    ]);
    const emailById = new Map(emails.map((e) => [e.id, e.email]));
    return new Map(profiles.map((p) => [p.id, { name: p.name, email: emailById.get(p.id) ?? null }]));
  }

  private async registrationCounts(affiliateIds: string[]): Promise<Map<string, number>> {
    if (affiliateIds.length === 0) return new Map();
    const rows = await this.prisma.profile.groupBy({
      by: ['referredByAffiliateId'],
      where: { referredByAffiliateId: { in: affiliateIds } },
      _count: { _all: true },
    });
    return new Map(rows.filter((r) => r.referredByAffiliateId).map((r) => [r.referredByAffiliateId as string, r._count._all]));
  }

  /** Raw count of other affiliates who applied using each affiliate's coupon code -- same batching shape as registrationCounts(), for the affiliate-to-affiliate pool. */
  private async affiliateReferralCounts(affiliateIds: string[]): Promise<Map<string, number>> {
    if (affiliateIds.length === 0) return new Map();
    const rows = await this.prisma.affiliate.groupBy({
      by: ['referredByAffiliateId'],
      where: { referredByAffiliateId: { in: affiliateIds } },
      _count: { _all: true },
    });
    return new Map(rows.filter((r) => r.referredByAffiliateId).map((r) => [r.referredByAffiliateId as string, r._count._all]));
  }

  /** Resolves an affiliate-to-affiliate referrer's id into a displayable name/email, for AdminAffiliateDetail.referredBy -- null if this affiliate didn't arrive via a coupon code. */
  private async referrerInfo(referrerAffiliateId: string | null): Promise<AdminAffiliateDetail['referredBy']> {
    if (!referrerAffiliateId) return null;
    const referrer = await this.prisma.affiliate.findUnique({ where: { id: referrerAffiliateId } });
    if (!referrer) return null;
    const name = (await this.namesAndEmails([referrer.userId])).get(referrer.userId);
    return { id: referrer.id, name: name?.name ?? null, email: name?.email ?? null };
  }
}
