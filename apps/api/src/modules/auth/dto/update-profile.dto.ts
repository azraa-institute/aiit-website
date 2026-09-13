import { IsISO31661Alpha2, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  /** Plain contact-info string -- not validated as a real phone number (no phone-based sign-in or verification anywhere in this app). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarKey?: string;
}
