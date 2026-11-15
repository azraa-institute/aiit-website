import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PromoCode } from '@prisma/client';
import type { GeneratePromoCodeRequest, PromoPreviewResponse } from '@aiit/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Either the ambient PrismaService or an active $transaction's client -- see priceCheckout's doc comment for why the caller picks which one. */
type PrismaOrTx = PrismaService | Prisma.TransactionClient;

export interface PriceCheckoutResult extends PromoPreviewResponse {
  promoCodeId: string;
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
   * Prices a would-be checkout against a code without creating anything.
   * Called twice in practice: once for the frontend's live preview (this
   * service, via the public PromoCodesController), and once more inside
   * PaymentsService.createPendingBundleOrder's own transaction right
   * before the real Order rows are created -- that second call is the one
   * that actually enforces the redemption cap, using the transactional
   * client (`tx`) so two students racing for the last slot can't both win.
   */
  async priceCheckout(code: string, courseIds: string[], tx: PrismaOrTx = this.prisma): Promise<PriceCheckoutResult> {
    const normalized = code.trim().toLowerCase();
    if (!normalized || courseIds.length === 0) throw new BadRequestException('Invalid or expired promo code.');

    const promoCode = await tx.promoCode.findFirst({ where: { code: normalized, active: true } });
    if (!promoCode) throw new BadRequestException('Invalid or expired promo code.');

    const uniqueCourseIds = [...new Set(courseIds)];
    const scoped = new Set(promoCode.courseIds);
    if (uniqueCourseIds.length === 0 || !uniqueCourseIds.every((id) => scoped.has(id))) {
      throw new BadRequestException('This promo code does not apply to one or more of the selected courses.');
    }

    const redeemed = await this.redemptionCount(promoCode.id, tx);
    if (redeemed >= promoCode.maxRedemptions) {
      throw new ConflictException('This promo code has reached its redemption limit.');
    }

    const pricePerCourseCents = uniqueCourseIds.length === promoCode.courseIds.length ? promoCode.bundlePriceCents : promoCode.singlePriceCents;
    return {
      promoCodeId: promoCode.id,
      pricePerCourseCents,
      totalAmountCents: pricePerCourseCents * uniqueCourseIds.length,
      currency: promoCode.currency,
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
