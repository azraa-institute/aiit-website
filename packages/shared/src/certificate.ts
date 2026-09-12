import type { EnrolledCourseSummary } from './enrollment';

export interface Certificate {
  id: string;
  credentialId: string;
  issuedAt: string;
  course: EnrolledCourseSummary;
}
