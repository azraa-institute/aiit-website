import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  courseSlug!: string;
}
