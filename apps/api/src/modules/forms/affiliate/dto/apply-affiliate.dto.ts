import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SOURCES = ['social', 'friend', 'other'] as const;
const INTENTS = ['refer', 'creators', 'both'] as const;

export class ApplyAffiliateDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

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
  referralCode?: string;

  @IsOptional()
  @IsIn(SOURCES)
  source?: string;

  @IsOptional()
  @IsIn(INTENTS)
  intent?: string;

  @IsString()
  turnstileToken!: string;
}
