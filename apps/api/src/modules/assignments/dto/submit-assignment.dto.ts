import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAssignmentDto {
  /** Supabase Storage object key -- the file itself is uploaded client-side directly to Storage. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}
