import { Equals, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { AffiliateType } from '@aiit/shared';
import { AFFILIATE_TYPES } from './apply-affiliate.dto';

/**
 * The public, no-session application -- an anonymous visitor applying for
 * the first time. Unlike ApplyAffiliateDto (an already-logged-in learner,
 * who has no password to choose because they already have an account),
 * this one collects name + email and nothing resembling a password: the
 * account is created server-side with a one-time password the applicant
 * never picks themselves (see AffiliatesService.applyNew()).
 */
export class ApplyNewAffiliateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsIn(AFFILIATE_TYPES)
  type!: AffiliateType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  signedName!: string;

  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Affiliate Agreement to apply.' })
  agreedToTerms!: boolean;

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

  /** A pending /r/:slug click (getPendingReferralSlug()), if the applicant arrived via one -- see AffiliatesService.applyNew(). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referralSlug?: string;
}
