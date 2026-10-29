import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, Equals, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { AffiliateType } from '@aiit/shared';
import { SocialLinkDto } from './social-link.dto';

export const AFFILIATE_TYPES = ['creator', 'student', 'affiliate_to_affiliate'] as const;

export class ApplyAffiliateDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(AFFILIATE_TYPES, { each: true })
  types!: AffiliateType[];

  // A coupon code is just another affiliate's own referral slug, typed in
  // rather than clicked -- see AffiliatesService.resolveAffiliateCouponCode().
  // Optional: most applicants don't have one.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  affiliateCouponCode?: string;

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
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivation?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
