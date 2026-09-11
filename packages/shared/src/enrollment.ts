/**
 * Shape/signature only -- no `enrollments` table or guard exists yet.
 * Reserved for the phase that adds real enrollment (out of scope here).
 */
export interface EnrollmentShape {
  id: string;
  userId: string;
  courseId: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolledAt: string;
}

export type HasActiveEnrollment = (userId: string, courseId: string) => Promise<boolean>;
