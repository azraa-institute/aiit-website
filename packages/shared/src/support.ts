/**
 * Student support & complaints, plus an instructor's own reports (about a
 * student) and the admin-side views -- see apps/api/src/modules/support and
 * apps/api/src/modules/instructor/instructor-complaints.service.ts.
 */

export type ComplaintCategory = 'learning_issue' | 'instructor' | 'course_content' | 'technical' | 'payment' | 'student' | 'other';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
export type ComplaintFilerRole = 'student' | 'instructor';

/** What a student sees of their own complaint. */
export interface ComplaintSummary {
  id: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  subject: string;
  courseTitle: string | null;
  instructorName: string | null;
  createdAt: string;
  updatedAt: string;
  replies: number;
}

export interface ThreadMessage {
  id: string;
  /** 'You' for the filer (student or instructor) or 'AIIT team' for admin; the admin's role is never a name. */
  from: 'student' | 'instructor' | 'admin';
  body: string;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  body: string;
  messages: ThreadMessage[];
}

/** The choices the "new complaint" form offers: only the caller's own enrolled courses and those courses' instructors. */
export interface ComplaintOptions {
  courses: { id: string; title: string; instructors: { id: string; name: string | null }[] }[];
}

/** An instructor's own filed reports (about a student) -- mirrors ComplaintSummary/Detail/Options. */
export interface InstructorComplaintSummary {
  id: string;
  status: ComplaintStatus;
  subject: string;
  studentName: string | null;
  courseTitle: string | null;
  createdAt: string;
  updatedAt: string;
  replies: number;
}

export interface InstructorComplaintDetail extends InstructorComplaintSummary {
  body: string;
  messages: ThreadMessage[];
}

/** The choices the instructor "report a student" form offers: only students enrolled in a course the caller teaches. */
export interface InstructorComplaintOptions {
  courses: { id: string; title: string; students: { id: string; name: string | null }[] }[];
}

export interface AdminComplaintSummary {
  id: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  subject: string;
  /** Who filed this -- a student, or (category 'student') the instructor reporting one. */
  filerRole: ComplaintFilerRole;
  filerId: string;
  filerName: string | null;
  /** The student this complaint concerns: the filer themself, or (filerRole 'instructor') who they reported. Null for a non-student-filed complaint that isn't about a student either. */
  studentId: string | null;
  studentName: string | null;
  courseTitle: string | null;
  instructorId: string | null;
  instructorName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminThreadMessage {
  id: string;
  authorRole: 'student' | 'instructor' | 'admin';
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface AdminComplaintDetail extends AdminComplaintSummary {
  /** Only set when studentId is set (the person this report is about, not necessarily the filer). */
  studentEmail: string | null;
  body: string;
  messages: AdminThreadMessage[];
}

export type AnnouncementAudience = 'all_students' | 'course' | 'instructors';

export interface AdminAnnouncement {
  id: string;
  audience: AnnouncementAudience;
  courseTitle: string | null;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: string;
}

export interface AttendanceReportRow {
  classId: string;
  title: string;
  courseTitle: string;
  startsAt: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  hostName: string | null;
  enrolled: number;
  attended: number;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
}
