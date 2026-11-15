import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PromoPreviewResponse } from '@aiit/shared';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PromoCourseSelectionDto } from '../dto/promo-preview.dto';
import { PromoCodesService } from './promo-codes.service';

/**
 * The only public-facing surface for a promo code: priced a would-be
 * checkout, never lists or echoes back valid codes. Requires sign-in, same
 * as every other payment endpoint -- a code is only meaningful once a
 * student is about to buy something.
 */
@Controller('payment-promos')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  @Post('preview')
  async preview(@Body() dto: PromoCourseSelectionDto): Promise<PromoPreviewResponse> {
    const courseIds = await this.promoCodes.resolveCourseIds(dto.courseSlugs);
    const priced = await this.promoCodes.priceCheckout(dto.promoCode, courseIds);
    return { pricePerCourseCents: priced.pricePerCourseCents, totalAmountCents: priced.totalAmountCents, currency: priced.currency };
  }
}
