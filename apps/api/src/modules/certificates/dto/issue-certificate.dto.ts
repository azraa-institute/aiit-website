import { IsUUID } from 'class-validator';

export class IssueCertificateDto {
  /** The learner to certify -- an admin action, so the target is specified explicitly, not inferred from the caller. */
  @IsUUID()
  userId!: string;
}
