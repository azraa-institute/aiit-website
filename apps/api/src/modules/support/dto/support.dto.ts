import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export const COMPLAINT_CATEGORIES = ['learning_issue', 'instructor', 'course_content', 'technical', 'payment', 'other'] as const;
export const COMPLAINT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;

export class CreateComplaintDto {
  @IsIn(COMPLAINT_CATEGORIES)
  category!: (typeof COMPLAINT_CATEGORIES)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10, { message: 'Please describe the problem in a little more detail.' })
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Only for a complaint about a teacher: must teach the chosen course. */
  @IsOptional()
  @IsUUID()
  instructorId?: string;
}

export class ComplaintMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}

export class AdminReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;

  /** An admin-only note: never shown to the student. */
  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}

export class SetComplaintStatusDto {
  @IsIn(COMPLAINT_STATUSES)
  status!: (typeof COMPLAINT_STATUSES)[number];
}
