/** Instructor portal shapes -- see apps/api/src/modules/instructor. */

export interface InstructorDashboard {
  courses: number;
  /** Distinct students enrolled across the instructor's courses. */
  students: number;
  /** Submissions handed in and waiting for a grade. */
  needsGrading: number;
  classesThisWeek: number;
  /** The oldest few ungraded submissions, for a quick start on the queue. */
  gradingQueue: GradingItem[];
}

export interface GradingItem {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  studentName: string | null;
  submittedAt: string;
}

export interface InstructorCourse {
  id: string;
  slug: string;
  title: string;
  enrolled: number;
  upcomingClasses: number;
  assignments: number;
  needsGrading: number;
}

export interface RosterStudent {
  id: string;
  name: string | null;
  email: string | null;
  country: string | null;
  timeZone: string | null;
  enrolledAt: string;
  /** Live classes of this course they joined, out of the classes that have already been held. */
  classesAttended: number;
  classesHeld: number;
  assignmentsSubmitted: number;
  assignmentsGraded: number;
  suspended: boolean;
}

export interface InstructorAssignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueAt: string | null;
  createdAt: string;
  enrolled: number;
  submitted: number;
  graded: number;
}

export type SubmissionStatus = 'not_submitted' | 'submitted' | 'graded';

export interface SubmissionRow {
  /** Null until the student hands something in. */
  submissionId: string | null;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  note: string | null;
  hasFile: boolean;
  fileName: string | null;
  grade: string | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface AssignmentSubmissions {
  assignment: InstructorAssignment;
  rows: SubmissionRow[];
}

export interface InstructorAnnouncement {
  id: string;
  courseId: string | null;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: string;
}
