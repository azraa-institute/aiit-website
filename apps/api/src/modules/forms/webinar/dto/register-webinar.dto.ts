import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const REGIONS = [
  'west-africa',
  'east-africa',
  'southern-africa',
  'south-asia',
  'southeast-asia',
  'other',
] as const;

const PERSONAS = ['student', 'professional', 'career-changer', 'enthusiast', 'partner'] as const;

export class RegisterWebinarDto {
  @IsString()
  @MaxLength(100)
  webinarSlug!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string;

  @IsIn(REGIONS)
  region!: string;

  @IsIn(PERSONAS)
  persona!: string;

  @IsString()
  turnstileToken!: string;
}
