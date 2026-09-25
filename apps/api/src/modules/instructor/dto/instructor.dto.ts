import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  /** ISO instant. Omit for an assignment with no deadline. */
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  /** Pass null to remove the deadline. */
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class GradeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  body!: string;
}
