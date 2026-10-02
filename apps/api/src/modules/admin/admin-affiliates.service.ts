import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Affiliate } from '@prisma/client';
import type { AdminAffiliateDetail, AdminAffiliateStats, AdminAffiliateSummary, AffiliateApplicationStatus, AffiliateType, Paginated } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';

const PAGE_SIZE = 25;

interface ListQuery {
  status?: AffiliateApplicationStatus;
  type?: AffiliateType;
  page?: number;
}

/** Admin screening for affiliate applications -- mirrors AdminComplaintsService's shape. */
@Injectable()
export class AdminAffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
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
    const where: Prisma.AffiliateWhereInput = {
      ...(query.status ? { applicationStatus: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.affiliate.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      this.prisma.affiliate.count({ where }),
    ]);

    const [names, counts] = await Promise.all([this.namesAndEmails(rows.map((r) => r.userId)), this.registrationCounts(rows.map((r) => r.id))]);
    return {
      items: rows.map((r) => this.toSummary(r, names, counts.get(r.id) ?? 0)),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async detail(id: string): Promise<AdminAffiliateDetail> {
    const row = await this.prisma.affiliate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Affiliate application not found.');

    const [names, count, reviewerName] = await Promise.all([
      this.namesAndEmails([row.userId]),
      this.prisma.profile.count({ where: { referredByAffiliateId: row.id } }),
      row.reviewedBy ? this.namesAndEmails([row.reviewedBy]) : Promise.resolve(new Map()),
    ]);
    return {
      ...this.toSummary(row, names, count),
      phone: row.phone,
      handle: row.handle,
      country: row.country,
      city: row.city,
      signedName: row.signedName,
      signedAt: row.signedAt?.toISOString() ?? null,
      source: row.source,
      rejectionReason: row.rejectionReason,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedByName: row.reviewedBy ? (reviewerName.get(row.reviewedBy)?.name ?? null) : null,
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

  // ---- helpers ----

  private async notifyApplicant(row: Affiliate, status: AffiliateApplicationStatus, rejectionReason?: string): Promise<void> {
    const approved = status === 'approved';
    const title = approved ? 'Your affiliate application was approved' : 'Your affiliate application was not approved';
    await this.prisma.notification.create({
      data: { userId: row.userId, kind: 'system', title, body: approved ? undefined : rejectionReason?.trim(), href: '/affiliate-portal' },
    });

    const email = (await this.namesAndEmails([row.userId])).get(row.userId)?.email;
    if (!email) return;
    const portalUrl = `${process.env.APP_URL ?? 'https://aiit.network'}/affiliate-portal`;
    await this.email.send({
      to: email,
      subject: title,
      html: brandedEmailHtml({
        heading: title,
        intro: approved
          ? "You're approved. Your personal referral link and dashboard are ready whenever you are."
          : `We can't move forward with this application right now.${rejectionReason ? ` ${rejectionReason.trim()}` : ''}`,
        ctaLabel: 'Open your affiliate dashboard',
        ctaUrl: portalUrl,
        footerNote: "You're receiving this because you applied to the AIIT affiliate program.",
      }),
    });
  }

  private toSummary(row: Affiliate, names: Map<string, { name: string | null; email: string | null }>, registrationCount: number): AdminAffiliateSummary {
    const person = names.get(row.userId);
    return {
      id: row.id,
      userId: row.userId,
      name: person?.name ?? null,
      email: person?.email ?? null,
      type: row.type,
      applicationStatus: row.applicationStatus,
      registrationCount,
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
}
