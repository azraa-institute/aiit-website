import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

/** {courseSlugs, promoCode} -- shared by the preview endpoint and Razorpay's bundle-order-creation endpoint, same request shape either way. */
export class PromoCourseSelectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  courseSlugs!: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  promoCode!: string;
}
