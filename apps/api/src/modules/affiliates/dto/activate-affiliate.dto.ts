import { IsString, MaxLength, MinLength } from 'class-validator';

export class ActivateAffiliateDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  referenceCode!: string;
}
