import { ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';

export class BulkIssueCertificatesDto {
  /** The learners to certify -- capped well above any real course roster, just as a sanity bound on the request body. */
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  userIds!: string[];
}
