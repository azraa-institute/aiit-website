import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AffiliateType } from '@aiit/shared';

export const AFFILIATE_TYPES = ['creator', 'student', 'affiliate_to_affiliate'] as const;

export class ApplyAffiliateDto {
  @IsIn(AFFILIATE_TYPES)
  type!: AffiliateType;

  // Only ever sent by the public application form (not by an already-
  // logged-in learner applying from their dashboard) -- screening context
  // for the admin, not used by anything else.
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
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
