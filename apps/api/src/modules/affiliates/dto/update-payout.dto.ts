import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import type { AffiliatePayoutMethod } from '@aiit/shared';

const PAYOUT_METHODS = ['paypal', 'bank'] as const;

/** At least one letter from any script -- rejects a pure number/symbol string (e.g. an account number pasted into the wrong field) without assuming a particular alphabet. */
const CONTAINS_A_LETTER = /\p{L}/u;

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
  @MinLength(2)
  @MaxLength(150)
  @Matches(CONTAINS_A_LETTER, { message: "bankAccountName must be the account holder's actual name, not just numbers." })
  bankAccountName?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MaxLength(60)
  bankAccountNumber?: string;

  @ValidateIf((o: UpdatePayoutDto) => o.method === 'bank')
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(CONTAINS_A_LETTER, { message: "bankName must be the bank's actual name, not just numbers." })
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bankCode?: string;
}
