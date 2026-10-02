import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, MaxLength, Min, ValidateIf } from 'class-validator';
import type { AdminAffiliateDetail, AdminAffiliateSummary, AffiliateApplicationStatus, AffiliateType, Paginated } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AFFILIATE_TYPES } from '../affiliates/dto/apply-affiliate.dto';
import { AdminAffiliatesService } from './admin-affiliates.service';

const AFFILIATE_STATUSES = ['pending', 'in_review', 'approved', 'rejected'] as const;

class ListAffiliatesQuery {
  @IsOptional()
  @IsIn(AFFILIATE_STATUSES)
  status?: AffiliateApplicationStatus;

  @IsOptional()
  @IsIn(AFFILIATE_TYPES)
  type?: AffiliateType;

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

@Controller('admin/affiliates')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminAffiliatesController {
  constructor(private readonly affiliates: AdminAffiliatesService) {}

  @Get()
  list(@Query() query: ListAffiliatesQuery): Promise<Paginated<AdminAffiliateSummary>> {
    return this.affiliates.list(query);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminAffiliateDetail> {
    return this.affiliates.detail(id);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAffiliateStatusDto,
  ): Promise<AdminAffiliateDetail> {
    return this.affiliates.setStatus(user.userId, id, dto.status, dto.rejectionReason);
  }
}
