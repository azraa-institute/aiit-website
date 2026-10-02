import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AffiliateMe } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AffiliatesService } from './affiliates.service';
import { ApplyAffiliateDto } from './dto/apply-affiliate.dto';

/** Not role-gated -- see AffiliatesService's doc comment for why. */
@Controller('affiliates')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AffiliatesController {
  constructor(private readonly affiliates: AffiliatesService) {}

  @Post('apply')
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyAffiliateDto): Promise<AffiliateMe> {
    const { type, ...context } = dto;
    return this.affiliates.apply(user.userId, type, context);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AffiliateMe> {
    return this.affiliates.me(user.userId);
  }
}
