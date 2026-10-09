import { IsString, MaxLength, MinLength } from 'class-validator';

/** Same shape as admin.dto.ts's SuspendUserDto -- a reason is required and kept in the audit log. */
export class RevokeCertificateDto {
  @IsString()
  @MinLength(3, { message: 'Give a short reason so the record shows why.' })
  @MaxLength(500)
  reason!: string;
}
