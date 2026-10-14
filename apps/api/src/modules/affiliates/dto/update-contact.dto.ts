import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Self-service edit of the context collected at application time (AffiliatesController's me/contact) -- circumstances change after applying. */
export class UpdateAffiliateContactDto {
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
