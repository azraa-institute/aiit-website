import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  razorpayPaymentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  razorpaySignature!: string;
}
