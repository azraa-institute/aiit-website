import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CartPriceResponse } from '@aiit/shared';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { CurrencyService } from '../../../common/currency/currency.service';
import { PromoCourseSelectionDto } from '../dto/promo-preview.dto';
import { PromoCodesService } from './promo-codes.service';

/**
 * The only public-facing surface for a promo code: prices a would-be cart
 * checkout, never lists or echoes back valid codes. Requires sign-in, same
 * as every other payment endpoint -- a code is only meaningful once a
 * student is about to buy something. `promoCode` is optional here too --
 * an empty cart preview (no code) is how the cart widget shows its running
 * total before anything is typed.
 */
@Controller('payment-promos')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PromoCodesController {
  constructor(
    private readonly promoCodes: PromoCodesService,
    private readonly currency: CurrencyService,
  ) {}

  @Post('preview')
  async preview(@Body() dto: PromoCourseSelectionDto): Promise<CartPriceResponse> {
    const courseIds = await this.promoCodes.resolveCourseIds(dto.courseSlugs);
    const priced = await this.promoCodes.priceCart(courseIds, dto.promoCode, (usdCents) =>
      this.currency.convert(usdCents, 'INR').then((r) => r.amountCents),
    );
    return {
      lines: priced.lines,
      totalAmountCents: priced.totalAmountCents,
      currency: priced.currency,
      promoApplied: priced.promoCodeId !== null,
    };
  }
}
