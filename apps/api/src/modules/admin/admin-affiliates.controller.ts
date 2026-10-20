import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEmail, IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import type { AdminAffiliateCredentials, AdminAffiliateDetail, AdminAffiliateStats, AdminAffiliateSummary, AdminFxRates, AffiliateApplicationStatus, AffiliateType, Paginated } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrencyService } from '../../common/currency/currency.service';
import { AFFILIATE_TYPES } from '../affiliates/dto/apply-affiliate.dto';
import { AdminAffiliatesService } from './admin-affiliates.service';

/** Local currencies shown alongside a USD figure on the affiliate detail drawer -- the audiences this program actually pays into right now. */
const DISPLAY_CURRENCIES = ['NGN', 'INR'];

const AFFILIATE_STATUSES = ['pending', 'in_review', 'approved', 'rejected'] as const;

/**
 * For someone AIIT already has a relationship with outside the public
 * application form -- no agreedToTerms/signedName here (unlike
 * ApplyNewAffiliateDto), since nothing is actually being electronically
 * signed through this screen. See AffiliatesService.createManually().
 */
class AdminCreateAffiliateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(AFFILIATE_TYPES, { each: true })
  types!: AffiliateType[];

  @IsOptional()
  @IsIn(AFFILIATE_STATUSES)
  status?: AffiliateApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivation?: string;
}

class ListAffiliatesQuery {
  @IsOptional()
  @IsIn(AFFILIATE_STATUSES)
  status?: AffiliateApplicationStatus;

  @IsOptional()
  @IsIn(AFFILIATE_TYPES)
  type?: AffiliateType;

  /** Name/email search, same ILIKE convention as ListStudentsQueryDto's `q` -- lets the Students page's "Affiliate" badge deep-link here by email. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

class SetAffiliateStatusDto {
  @IsIn(AFFILIATE_STATUSES)
  status!: AffiliateApplicationStatus;

  @ValidateIf((o: SetAffiliateStatusDto) => o.status === 'rejected')
  @MaxLength(500)
  rejectionReason?: string;
}

/** An admin recording a payout they already sent themselves -- see AdminAffiliatesService.recordPayout()'s doc comment; this never moves money. */
class RecordPayoutDto {
  /** Whole-dollar amount, not cents -- the UI collects a plain dollar figure; cents live only in the DB/API response. */
  @IsInt()
  @IsPositive()
  amountDollars!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

@Controller('admin/affiliates')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminAffiliatesController {
  constructor(
    private readonly affiliates: AdminAffiliatesService,
    private readonly currency: CurrencyService,
  ) {}

  @Get()
  list(@Query() query: ListAffiliatesQuery): Promise<Paginated<AdminAffiliateSummary>> {
    return this.affiliates.list(query);
  }

  // Both declared before ':id' -- Nest matches routes in order, so these
  // would otherwise be swallowed by the :id param route.
  @Get('stats')
  stats(): Promise<AdminAffiliateStats> {
    return this.affiliates.stats();
  }

  @Get('fx-rates')
  async fxRates(): Promise<AdminFxRates> {
    return { rates: await this.currency.getRates(DISPLAY_CURRENCIES) };
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminAffiliateDetail> {
    return this.affiliates.detail(id);
  }

  /** The response carries the temporary password -- shown to the admin once, never stored, never cached. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdminCreateAffiliateDto,
    @Req() request: Request,
  ): Promise<AdminAffiliateCredentials> {
    return this.affiliates.createManually(user.userId, dto, request.ip);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAffiliateStatusDto,
  ): Promise<AdminAffiliateDetail> {
    return this.affiliates.setStatus(user.userId, id, dto.status, dto.rejectionReason);
  }

  @Post(':id/payouts')
  recordPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPayoutDto,
  ): Promise<AdminAffiliateDetail> {
    return this.affiliates.recordPayout(user.userId, id, dto.amountDollars * 100, dto.note);
  }
}
