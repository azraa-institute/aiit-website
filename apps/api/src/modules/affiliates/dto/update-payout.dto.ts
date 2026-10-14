import { IsEmail, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { AffiliatePayoutMethod } from '@aiit/shared';

const PAYOUT_METHODS = ['paypal', 'bank'] as const;

/** Self-reported, admin-visible only -- see AffiliatesService.updatePayoutDetails()'s doc comment. */
export class UpdatePayoutDto {
  @IsIn(PAYOUT_METHODS)
  method!: AffiliatePayoutMethod;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'paypal')
  @IsEmail()
  @MaxLength(255)
  paypalEmail?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MaxLength(100)
  bankCountry?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MaxLength(150)
  bankAccountName?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MaxLength(60)
  bankAccountNumber?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MaxLength(150)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bankCode?: string;
}
