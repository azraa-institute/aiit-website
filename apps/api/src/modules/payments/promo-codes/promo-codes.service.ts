import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PromoCode } from '@prisma/client';
import type { CartPricedLine, GeneratePromoCodeRequest } from '@aiit/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Either the ambient PrismaService or an active $transaction's client -- see priceCart's doc comment for why the caller picks which one. */
type PrismaOrTx = PrismaService | Prisma.TransactionClient;

/** Internal only -- unlike CartPriceResponse (the public API shape), this carries the real PromoCode id so PaymentsService knows exactly which Order rows to stamp with it. Never returned from a controller directly. */
export interface CartPriceResult {
  promoCodeId: string | null;
  lines: CartPricedLine[];
  totalAmountCents: number;
  currency: string;
}

/**
 * Promo-code pricing/validation for the MBA certification bundle checkout
 * (see PromoCode in schema.prisma). Deliberately has no public "list valid
 * codes" method anywhere -- a code is only ever resolved by exact value,
 * never enumerated.
 */
@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin-only -- see AdminPromoCodesController. */
  async generateCode(adminId: string, input: GeneratePromoCodeRequest): Promise<PromoCode> {
    if (input.courseIds.length === 0) throw new BadRequestException('Select at least one course.');
    if (input.singlePriceCents <= 0 || input.bundlePriceCents <= 0) {
      throw new BadRequestException('Enter prices greater than zero.');
    }
    if (input.maxRedemptions <= 0) throw new BadRequestException('Enter a redemption cap greater than zero.');

    const code = (input.code?.trim() || generatePromoCode()).toLowerCase();
    return this.prisma.promoCode
      .create({
        data: {
          code,
          courseIds: [...new Set(input.courseIds)],
          singlePriceCents: input.singlePriceCents,
          bundlePriceCents: input.bundlePriceCents,
          maxRedemptions: input.maxRedemptions,
          createdByAdminId: adminId,
        },
      })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('That code is already in use. Try a different one.');
        }
        throw err;
      });
  }

  /**
   * Count of distinct successful checkouts, not distinct Order rows -- a
   * 3-course bundle purchase is one checkout (one Razorpay providerRef)
   * and must only consume one of maxRedemptions, not three. This is the
   * concrete "a count of 1 means the person has already paid" rule.
   */
  async redemptionCount(promoCodeId: string, tx: PrismaOrTx = this.prisma): Promise<number> {
    const rows = await tx.order.groupBy({
      by: ['providerRef'],
      where: { promoCodeId, status: 'paid' },
      _count: { _all: true },
    });
    return rows.length;
  }

  /**
   * Prices a cart (any 1-N courses) without creating anything. Called
   * twice in practice: once for the frontend's live preview (this
   * service, via the public PromoCodesController), and once more inside
   * PaymentsService.createPendingBundleOrder's own transaction right
   * before the real Order rows are created -- that second call is the one
   * that actually enforces the redemption cap, using the transactional
   * client (`tx`) so two students racing for the last slot can't both win.
   *
   * `promoCode` is optional -- a cart can check out with no code at all,
   * in which case every line is priced via `convert` (the caller's own
   * USD-cents -> INR-cents conversion, so this service stays currency-
   * agnostic). When a code is given, only the courses inside its own
   * `courseIds` scope are "eligible" and get the code's price; everything
   * else in the cart still prices via `convert`, same as the no-code case
   * -- a cart is allowed to mix coupon-eligible and ordinary courses in
   * one checkout. `promoCodeId` on the result (and thus the redemption
   * counter) is only ever non-null when at least one line was actually
   * eligible -- a code that matches nothing in the cart never "applies."
   */
  async priceCart(
    courseIds: string[],
    promoCode: string | undefined,
    convert: (usdCents: number) => Promise<number>,
    tx: PrismaOrTx = this.prisma,
  ): Promise<CartPriceResult> {
    const uniqueCourseIds = [...new Set(courseIds)];
    if (uniqueCourseIds.length === 0) throw new BadRequestException('Your cart is empty.');

    const courses = await tx.course.findMany({
      where: { id: { in: uniqueCourseIds } },
      select: { id: true, priceUsdCents: true },
    });
    const priceById = new Map(courses.map((c) => [c.id, c.priceUsdCents]));

    let eligibleIds = new Set<string>();
    let promoCodeRow: PromoCode | null = null;
    const normalized = promoCode?.trim().toLowerCase();
    if (normalized) {
      promoCodeRow = await tx.promoCode.findFirst({ where: { code: normalized, active: true } });
      if (!promoCodeRow) throw new BadRequestException('Invalid or expired promo code.');

      const scoped = new Set(promoCodeRow.courseIds);
      eligibleIds = new Set(uniqueCourseIds.filter((id) => scoped.has(id)));
      if (eligibleIds.size === 0) {
        throw new BadRequestException('This promo code does not apply to any course in your selection.');
      }

      const redeemed = await this.redemptionCount(promoCodeRow.id, tx);
      if (redeemed >= promoCodeRow.maxRedemptions) {
        throw new ConflictException('This promo code has reached its redemption limit.');
      }
    }

    const eligiblePriceCents = promoCodeRow
      ? eligibleIds.size === promoCodeRow.courseIds.length
        ? promoCodeRow.bundlePriceCents
        : promoCodeRow.singlePriceCents
      : 0;

    const lines: CartPricedLine[] = [];
    for (const courseId of uniqueCourseIds) {
      if (eligibleIds.has(courseId)) {
        lines.push({ courseId, amountCents: eligiblePriceCents, eligible: true });
        continue;
      }
      const usdCents = priceById.get(courseId);
      if (usdCents == null) throw new BadRequestException('One or more selected courses are not available for purchase.');
      lines.push({ courseId, amountCents: await convert(usdCents), eligible: false });
    }

    return {
      promoCodeId: eligibleIds.size > 0 ? (promoCodeRow?.id ?? null) : null,
      lines,
      totalAmountCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
      currency: 'INR',
    };
  }

  async findById(id: string): Promise<PromoCode> {
    const row = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Promo code not found.');
    return row;
  }

  /** Resolves course slugs to ids, 400ing if any slug doesn't exist or isn't a one-time-paid course -- shared by the preview endpoint and PaymentsService.createPendingBundleOrder. */
  async resolveCourseIds(courseSlugs: string[], tx: PrismaOrTx = this.prisma): Promise<string[]> {
    const unique = [...new Set(courseSlugs)];
    const courses = await tx.course.findMany({
      where: { slug: { in: unique }, status: 'published', deletedAt: null, pricing: 'paid' },
      select: { id: true, slug: true },
    });
    if (courses.length !== unique.length) {
      throw new BadRequestException('One or more selected courses are not available for purchase.');
    }
    return courses.map((c) => c.id);
  }
}

/** Short, typeable, visually distinct -- same convention as affiliates.service.ts's generateReferenceCode(). */
function generatePromoCode(): string {
  return `MBA-${randomBytes(3).toString('hex').toUpperCase()}`;
}
