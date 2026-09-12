import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GradeSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  grade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
