import { Injectable } from '@nestjs/common';
import { Prisma, type Order, type PromoCode } from '@prisma/client';
import type { AdminPromoCodeDetail, AdminPromoCodeRedemption, AdminPromoCodeSummary, GeneratePromoCodeRequest } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { PromoCodesService } from '../payments/promo-codes/promo-codes.service';

/** Admin-only generate/list/detail/activate for the MBA-certification promo-code mechanism -- see PromoCode in schema.prisma. Never exposed to any non-admin route. */
@Injectable()
export class AdminPromoCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly promoCodes: PromoCodesService,
  ) {}

  async list(): Promise<AdminPromoCodeSummary[]> {
    const rows = await this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    const [titles, counts] = await Promise.all([
      this.courseTitles(rows.flatMap((r) => r.courseIds)),
      this.redemptionCounts(rows.map((r) => r.id)),
    ]);
    return rows.map((r) => this.toSummary(r, titles, counts.get(r.id) ?? 0));
  }

  async detail(id: string): Promise<AdminPromoCodeDetail> {
    const row = await this.promoCodes.findById(id);
    const [titles, count, redemptions] = await Promise.all([
      this.courseTitles(row.courseIds),
      this.promoCodes.redemptionCount(row.id),
      this.redemptionDetails(row.id),
    ]);
    return { ...this.toSummary(row, titles, count), courseIds: row.courseIds, redemptions };
  }

  /** The response carries the plaintext code -- shown to the admin once, same "no-store" handling as AdminAffiliatesController's temporaryPassword. */
  async generate(adminId: string, dto: GeneratePromoCodeRequest): Promise<AdminPromoCodeDetail> {
    const row = await this.promoCodes.generateCode(adminId, dto);
    await this.audit.record(adminId, 'promo_code.create', 'promo_code', row.id, { code: row.code, courseIds: row.courseIds });
    return this.detail(row.id);
  }

  async setActive(adminId: string, id: string, active: boolean): Promise<AdminPromoCodeDetail> {
    await this.prisma.promoCode.update({ where: { id }, data: { active } });
    await this.audit.record(adminId, 'promo_code.update', 'promo_code', id, { active });
    return this.detail(id);
  }

  async updateCap(adminId: string, id: string, maxRedemptions: number): Promise<AdminPromoCodeDetail> {
    await this.prisma.promoCode.update({ where: { id }, data: { maxRedemptions } });
    await this.audit.record(adminId, 'promo_code.update', 'promo_code', id, { maxRedemptions });
    return this.detail(id);
  }

  // ---- helpers ----

  private toSummary(row: PromoCode, titles: Map<string, string>, paidRedemptionCount: number): AdminPromoCodeSummary {
    return {
      id: row.id,
      code: row.code,
      courseTitles: row.courseIds.map((id) => titles.get(id) ?? 'Unknown course'),
      singlePriceCents: row.singlePriceCents,
      bundlePriceCents: row.bundlePriceCents,
      currency: row.currency,
      maxRedemptions: row.maxRedemptions,
      paidRedemptionCount,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async courseTitles(courseIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(courseIds)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.course.findMany({ where: { id: { in: unique } }, select: { id: true, title: true } });
    return new Map(rows.map((r) => [r.id, r.title]));
  }

  /** One distinct providerRef (= one checkout) per paid redemption -- batched across several codes at once, same shape as admin-affiliates.service.ts's registrationCounts(). */
  private async redemptionCounts(promoCodeIds: string[]): Promise<Map<string, number>> {
    if (promoCodeIds.length === 0) return new Map();
    const rows = await this.prisma.order.groupBy({
      by: ['promoCodeId', 'providerRef'],
      where: { promoCodeId: { in: promoCodeIds }, status: 'paid' },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.promoCodeId) continue;
      counts.set(r.promoCodeId, (counts.get(r.promoCodeId) ?? 0) + 1);
    }
    return counts;
  }

  /** One row per distinct checkout (providerRef), not per Order -- groups the bundled Order rows from one payment back together. */
  private async redemptionDetails(promoCodeId: string): Promise<AdminPromoCodeRedemption[]> {
    const orders = await this.prisma.order.findMany({ where: { promoCodeId, status: 'paid' }, orderBy: { paidAt: 'desc' } });
    const grouped = new Map<string, Order[]>();
    for (const order of orders) {
      if (!order.providerRef) continue;
      const group = grouped.get(order.providerRef) ?? [];
      group.push(order);
      grouped.set(order.providerRef, group);
    }

    const names = await this.namesAndEmails(orders.map((o) => o.userId));
    return [...grouped.entries()].map(([providerRef, group]) => {
      const person = names.get(group[0].userId);
      return {
        providerRef,
        userName: person?.name ?? null,
        userEmail: person?.email ?? null,
        courseCount: group.length,
        amountCents: group.reduce((sum, o) => sum + o.amountCents, 0),
        paidAt: (group[0].paidAt ?? group[0].createdAt).toISOString(),
      };
    });
  }

  /** Same raw-SQL lookup admin-affiliates.service.ts uses -- auth.users isn't a Prisma model. */
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
}
