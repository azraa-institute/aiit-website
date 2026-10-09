import type { EnrolledCourseSummary } from './enrollment';

export interface Certificate {
  id: string;
  credentialId: string;
  /** Snapshotted at issuance, not the learner's current profile name -- see the schema comment on Certificate.holderName. */
  holderName: string;
  issuedAt: string;
  course: EnrolledCourseSummary;
  /** Set only by an admin's revoke action -- see the schema comment on Certificate.revokedAt. Still a valid, resolvable record when set, just no longer current. */
  revokedAt: string | null;
  revokedReason: string | null;
}
