import { IsIn, IsInt, IsOptional, IsUrl, Min, MaxLength } from 'class-validator';
import type { AffiliateSocialPlatform } from '@aiit/shared';

export const AFFILIATE_SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'facebook', 'other'] as const;

/**
 * One social profile given on the application -- see the
 * Affiliate.socialLinks schema comment for the full shape (only `platform`/
 * `url`/`followersReported` are ever applicant-supplied; the rest is filled
 * in server-side, best-effort, after submission).
 */
export class SocialLinkDto {
  @IsIn(AFFILIATE_SOCIAL_PLATFORMS)
  platform!: AffiliateSocialPlatform;

  @IsUrl()
  @MaxLength(300)
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  followersReported?: number;
}
