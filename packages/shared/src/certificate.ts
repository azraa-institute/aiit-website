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

// ---- Bulk issuance (admin) ----

/** One row of a course's enrolled-students list, as shown on the bulk-issue panel. */
export interface CertificateEligibleStudent {
  userId: string;
  name: string | null;
  email: string | null;
  /** A certificate for this course already exists (active or revoked) -- the UI excludes these from selection instead of offering a re-issue that would 409. */
  hasCertificate: boolean;
}

export interface BulkIssueCertificatesResult {
  issued: { userId: string; credentialId: string }[];
  /** Per-learner failure reason (already has one, no profile name yet, etc.) -- a bulk action doesn't fail the whole batch for one bad row. */
  skipped: { userId: string; reason: string }[];
}
