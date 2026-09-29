import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateInstructorComplaintDto {
  @IsUUID()
  studentId!: string;

  /** Which of the caller's courses this is about; if omitted, the student must still be enrolled in at least one course the caller teaches. */
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10, { message: 'Please describe the issue in a little more detail.' })
  @MaxLength(5000)
  body!: string;
}
