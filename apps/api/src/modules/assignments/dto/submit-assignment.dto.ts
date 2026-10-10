import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * No fileKey here anymore -- the file itself now rides along in the same
 * multipart request (see AssignmentSubmissionsController.submit), uploaded
 * server-side with the service-role client. A client-supplied Storage key
 * would mean trusting the client to say what it uploaded (or claim a key
 * it never uploaded at all); deriving it server-side from the actual
 * uploaded bytes closes that off, same reasoning as ProfileController's
 * avatar upload.
 */
export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}
