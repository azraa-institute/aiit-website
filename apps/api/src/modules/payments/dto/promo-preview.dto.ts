import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** {courseSlugs, promoCode?} -- shared by the cart preview endpoint and Razorpay's bundle-order-creation endpoint, same request shape either way. promoCode is optional: a cart can price/check out with no code at all. */
export class PromoCourseSelectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  courseSlugs!: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  promoCode?: string;
}
