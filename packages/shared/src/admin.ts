import type { Timetable } from './live-class';

/** Admin portal shapes -- see apps/api/src/modules/admin. */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminDashboard {
  students: {
    total: number;
    active: number;
    suspended: number;
    /** Signed up in the last 7 days. */
    newThisWeek: number;
  };
  instructors: { total: number; active: number; suspended: number };
  /** Students enrolled per published course (cancelled enrollments excluded). */
  courses: { id: string; slug: string; title: string; enrolled: number }[];
  classes: { liveNow: number; upcomingWeek: number };
}

export type AccountStatus = 'active' | 'suspended' | 'pending_deletion';

export interface StudentSummary {
  id: string;
  name: string | null;
  email: string | null;
  country: string | null;
  status: AccountStatus;
  joinedAt: string;
  enrolledCourses: number;
}

export interface StudentDetail extends StudentSummary {
  phone: string | null;
  timeZone: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  enrollments: { courseId: string; courseTitle: string; status: string; enrolledAt: string }[];
  attendance: { attended: number };
}

export interface InstructorSummary {
  id: string;
  name: string | null;
  email: string | null;
  headline: string | null;
  status: AccountStatus;
  createdAt: string;
  suspendedReason: string | null;
  /** Upcoming classes currently assigned to them. */
  upcomingClasses: number;
}

/** Returned once, at creation or password reset -- the API never stores or re-serves the plain password. */
export interface StaffCredentials {
  instructor: InstructorSummary;
  temporaryPassword: string;
}

export interface SuspendResult {
  id: string;
  status: AccountStatus;
  /** For instructors: upcoming classes that still name them as host and need reassigning. */
  affectedUpcomingClasses: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---- Course <-> instructor assignment + automatic timetables ----

export interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  enrolled: number;
  instructors: { id: string; name: string | null }[];
}

export interface TimetableConflict {
  startsAt: string;
  endsAt: string;
  /** Title of the class the instructor is already teaching at that time. */
  otherClass: string;
}

export type GenerateTimetableResponse =
  | {
      status: 'created';
      timetable: Timetable;
      created: number;
      /** True when the course has no instructor assigned yet -- the classes exist but nobody is set to host them. */
      unassigned: boolean;
      instructorName: string | null;
    }
  | { status: 'conflicts'; instructorName: string | null; conflicts: TimetableConflict[] };
