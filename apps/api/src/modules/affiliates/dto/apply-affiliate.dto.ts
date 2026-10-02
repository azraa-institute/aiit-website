import { Equals, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { AffiliateType } from '@aiit/shared';

export const AFFILIATE_TYPES = ['creator', 'student', 'affiliate_to_affiliate'] as const;

export class ApplyAffiliateDto {
  @IsIn(AFFILIATE_TYPES)
  type!: AffiliateType;

  // The electronic signature itself -- typed deliberately into its own
  // field (see AffiliatePage.tsx's comment on why it isn't pre-filled from
  // `name`), plus an explicit, must-be-true consent checkbox. Together
  // these are the evidence of consent Clause 21 (Electronic Signature)
  // describes; see AffiliatesService.apply() for what gets stored.
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  signedName!: string;

  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Affiliate Agreement to apply.' })
  agreedToTerms!: boolean;

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
