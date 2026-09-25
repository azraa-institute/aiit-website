/** Student support & complaints, plus the admin-side views -- see apps/api/src/modules/support. */

export type ComplaintCategory = 'learning_issue' | 'instructor' | 'course_content' | 'technical' | 'payment' | 'other';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

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
  /** 'You' or 'AIIT team' for a student; the admin's role is never a name. */
  from: 'student' | 'admin';
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

export interface AdminComplaintSummary {
  id: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  subject: string;
  studentId: string;
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
  authorRole: 'student' | 'admin';
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface AdminComplaintDetail extends AdminComplaintSummary {
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
