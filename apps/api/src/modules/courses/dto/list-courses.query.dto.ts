import { IsOptional, IsString } from 'class-validator';

export class ListCoursesQueryDto {
  /** Manual display-currency override, e.g. ?currency=NGN. */
  @IsOptional()
  @IsString()
  currency?: string;
}
