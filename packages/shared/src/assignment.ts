import type { EnrolledCourseSummary } from './enrollment';

/** Derived server-side from submittedAt/gradedAt/dueAt -- never stored, so it can't drift out of sync with them. */
export type AssignmentStatus = 'upcoming' | 'overdue' | 'submitted' | 'graded';

export interface AssignmentSubmission {
  fileKey: string | null;
  note: string | null;
  submittedAt: string | null;
  grade: string | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  status: AssignmentStatus;
  course: EnrolledCourseSummary;
  submission: AssignmentSubmission | null;
}
