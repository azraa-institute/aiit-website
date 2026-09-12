import type { CourseDomain, CourseLevel, PricingModel } from './catalogue';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

/** Minimal course display fields embedded in enrollment/assignment/certificate responses, so the client never re-joins against the catalogue. */
export interface EnrolledCourseSummary {
  id: string;
  slug: string;
  title: string;
  image: string;
  level: CourseLevel;
  pricing: PricingModel;
  domain: CourseDomain | null;
}

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  course: EnrolledCourseSummary;
}
