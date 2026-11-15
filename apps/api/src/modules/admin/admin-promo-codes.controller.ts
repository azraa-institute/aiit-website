import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { AdminPromoCodeDetail, AdminPromoCodeSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminPromoCodesService } from './admin-promo-codes.service';

class GeneratePromoCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  courseIds!: string[];

  @IsInt()
  @IsPositive()
  singlePriceCents!: number;

  @IsInt()
  @IsPositive()
  bundlePriceCents!: number;

  @IsInt()
  @IsPositive()
  maxRedemptions!: number;
}

class UpdatePromoCodeDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxRedemptions?: number;
}

@Controller('admin/promo-codes')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminPromoCodesController {
  constructor(private readonly promoCodes: AdminPromoCodesService) {}

  @Get()
  list(): Promise<AdminPromoCodeSummary[]> {
    return this.promoCodes.list();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminPromoCodeDetail> {
    return this.promoCodes.detail(id);
  }

  /** The response carries the plaintext code -- shown to the admin once, never cached, never surfaced anywhere else. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneratePromoCodeDto): Promise<AdminPromoCodeDetail> {
    return this.promoCodes.generate(user.userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromoCodeDto): Promise<AdminPromoCodeDetail> {
    if (dto.maxRedemptions !== undefined) return this.promoCodes.updateCap(user.userId, id, dto.maxRedemptions);
    return this.promoCodes.setActive(user.userId, id, dto.active ?? true);
  }
}
