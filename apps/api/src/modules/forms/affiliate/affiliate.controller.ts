import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import { AffiliateService } from './affiliate.service';
import { ApplyAffiliateDto } from './dto/apply-affiliate.dto';

@Controller('affiliate-applications')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AffiliateController {
  constructor(
    private readonly affiliate: AffiliateService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async apply(@Body() dto: ApplyAffiliateDto, @Req() request: Request): Promise<void> {
    await this.turnstile.verify(dto.turnstileToken, request.ip);
    await this.affiliate.apply(dto);
  }
}
