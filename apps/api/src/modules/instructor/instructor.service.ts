import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AssignmentSubmissions,
  GradingItem,
  InstructorAnnouncement,
  InstructorAssignment,
  InstructorCourse,
  InstructorDashboard,
  RosterStudent,
  SubmissionRow,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseAdminService } from '../../common/supabase-admin/supabase-admin.service';
import type { CreateAnnouncementDto, CreateAssignmentDto, GradeDto, UpdateAssignmentDto } from './dto/instructor.dto';

const DAY = 86_400_000;
const SUBMISSIONS_BUCKET = 'submissions';
const FILE_LINK_SECONDS = 300;

/**
 * Everything an instructor can do, always scoped to the courses an admin has
 * assigned them (course_instructors). Every method that takes a course,
 * assignment or submission id first proves the caller teaches that course --
 * an instructor never sees another instructor's students or work.
 */
@Injectable()
export class InstructorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  // ---- access ----

  private async courseIds(instructorId: string): Promise<string[]> {
    const rows = await this.prisma.courseInstructor.findMany({ where: { instructorId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  async assertTeaches(instructorId: string, courseId: string): Promise<void> {
    const row = await this.prisma.courseInstructor.findUnique({
      where: { courseId_instructorId: { courseId, instructorId } },
      select: { courseId: true },
    });
    if (!row) throw new ForbiddenException('You do not teach this course.');
  }

  private async assignmentFor(instructorId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, courseId: true, title: true, description: true, dueAt: true, createdAt: true, course: { select: { title: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found.');
    await this.assertTeaches(instructorId, assignment.courseId);
    return assignment;
  }

  // ---- dashboard + courses ----

  async dashboard(instructorId: string): Promise<InstructorDashboard> {
    const ids = await this.courseIds(instructorId);
    if (ids.length === 0) return { courses: 0, students: 0, needsGrading: 0, classesThisWeek: 0, gradingQueue: [] };

    const now = new Date();
    const [students, needsGrading, classesThisWeek, gradingQueue] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId: { in: ids }, status: { not: 'cancelled' } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.assignmentSubmission.count({
        where: { submittedAt: { not: null }, gradedAt: null, assignment: { courseId: { in: ids } } },
      }),
      this.prisma.liveClass.count({
        where: {
          hostUserId: instructorId,
          status: { in: ['scheduled', 'live'] },
          startsAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) },
        },
      }),
      this.queue(ids, 5),
    ]);
    return { courses: ids.length, students: students.length, needsGrading, classesThisWeek, gradingQueue };
  }

  async courses(instructorId: string): Promise<InstructorCourse[]> {
    const ids = await this.courseIds(instructorId);
    if (ids.length === 0) return [];

    const [courses, upcoming, ungraded] = await Promise.all([
      this.prisma.course.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          slug: true,
          title: true,
          _count: { select: { enrollments: { where: { status: { not: 'cancelled' } } }, assignments: true } },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.liveClass.groupBy({
        by: ['courseId'],
        where: { hostUserId: instructorId, courseId: { in: ids }, status: 'scheduled', startsAt: { gt: new Date() } },
        _count: { _all: true },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { submittedAt: { not: null }, gradedAt: null, assignment: { courseId: { in: ids } } },
        select: { assignment: { select: { courseId: true } } },
      }),
    ]);
    const upcomingBy = new Map(upcoming.map((u) => [u.courseId, u._count._all]));
    const ungradedBy = new Map<string, number>();
    for (const s of ungraded) ungradedBy.set(s.assignment.courseId, (ungradedBy.get(s.assignment.courseId) ?? 0) + 1);

    return courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      enrolled: c._count.enrollments,
      assignments: c._count.assignments,
      upcomingClasses: upcomingBy.get(c.id) ?? 0,
      needsGrading: ungradedBy.get(c.id) ?? 0,
    }));
  }

  // ---- roster ----

  async roster(instructorId: string, courseId: string): Promise<RosterStudent[]> {
    await this.assertTeaches(instructorId, courseId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId, status: { not: 'cancelled' } },
      select: { userId: true, enrolledAt: true },
      orderBy: { enrolledAt: 'asc' },
    });
    const userIds = enrollments.map((e) => e.userId);
    if (userIds.length === 0) return [];

    const [profiles, emails, held, attendance, submissions] = await Promise.all([
      this.prisma.profile.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, country: true, timeZone: true, status: true },
      }),
      this.emailsFor(userIds),
      this.prisma.liveClass.count({ where: { courseId, status: 'ended' } }),
      this.prisma.liveClassAttendance.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, liveClass: { courseId } },
        _count: { _all: true },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { userId: { in: userIds }, submittedAt: { not: null }, assignment: { courseId } },
        select: { userId: true, gradedAt: true },
      }),
    ]);
    const byProfile = new Map(profiles.map((p) => [p.id, p]));
    const attended = new Map(attendance.map((a) => [a.userId, a._count._all]));
    const submitted = new Map<string, number>();
    const graded = new Map<string, number>();
    for (const s of submissions) {
      submitted.set(s.userId, (submitted.get(s.userId) ?? 0) + 1);
      if (s.gradedAt) graded.set(s.userId, (graded.get(s.userId) ?? 0) + 1);
    }

    return enrollments.map((e) => {
      const p = byProfile.get(e.userId);
      return {
        id: e.userId,
        name: p?.name ?? null,
        email: emails.get(e.userId) ?? null,
        country: p?.country ?? null,
        timeZone: p?.timeZone ?? null,
        enrolledAt: e.enrolledAt.toISOString(),
        classesAttended: Math.min(attended.get(e.userId) ?? 0, Math.max(held, attended.get(e.userId) ?? 0)),
        classesHeld: held,
        assignmentsSubmitted: submitted.get(e.userId) ?? 0,
        assignmentsGraded: graded.get(e.userId) ?? 0,
        suspended: p?.status === 'suspended',
      };
    });
  }

  // ---- assignments ----

  async assignments(instructorId: string, courseId: string): Promise<InstructorAssignment[]> {
    await this.assertTeaches(instructorId, courseId);
    const [course, enrolled, rows] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
      this.prisma.enrollment.count({ where: { courseId, status: { not: 'cancelled' } } }),
      this.prisma.assignment.findMany({
        where: { courseId },
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          createdAt: true,
          submissions: { where: { submittedAt: { not: null } }, select: { gradedAt: true } },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);
    return rows.map((r) => ({
      id: r.id,
      courseId,
      courseTitle: course?.title ?? '',
      title: r.title,
      description: r.description,
      dueAt: r.dueAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      enrolled,
      submitted: r.submissions.length,
      graded: r.submissions.filter((s) => s.gradedAt).length,
    }));
  }

  async createAssignment(instructorId: string, courseId: string, dto: CreateAssignmentDto): Promise<InstructorAssignment> {
    await this.assertTeaches(instructorId, courseId);
    const dueAt = this.parseDue(dto.dueAt);
    const created = await this.prisma.assignment.create({
      data: { courseId, title: dto.title.trim(), description: dto.description.trim(), dueAt, createdBy: instructorId },
      select: { id: true, title: true, course: { select: { title: true } } },
    });
    await this.notifyEnrolled(courseId, {
      kind: 'assignment',
      title: `New assignment: ${created.title}`,
      body: `${created.course.title}${dueAt ? ` — due ${dueAt.toUTCString()}` : ''}`,
      href: '/portal/assignments',
    });
    return (await this.assignments(instructorId, courseId)).find((a) => a.id === created.id) as InstructorAssignment;
  }

  async updateAssignment(instructorId: string, id: string, dto: UpdateAssignmentDto): Promise<InstructorAssignment> {
    const existing = await this.assignmentFor(instructorId, id);
    await this.prisma.assignment.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        dueAt: dto.dueAt === undefined ? undefined : this.parseDue(dto.dueAt),
      },
    });
    return (await this.assignments(instructorId, existing.courseId)).find((a) => a.id === id) as InstructorAssignment;
  }

  async deleteAssignment(instructorId: string, id: string): Promise<void> {
    await this.assignmentFor(instructorId, id);
    const handedIn = await this.prisma.assignmentSubmission.count({ where: { assignmentId: id } });
    if (handedIn > 0) {
      throw new ConflictException('Students have already handed work in for this assignment, so it cannot be deleted.');
    }
    await this.prisma.assignment.delete({ where: { id } });
  }

  async submissions(instructorId: string, assignmentId: string): Promise<AssignmentSubmissions> {
    const assignment = await this.assignmentFor(instructorId, assignmentId);
    const [enrollments, subs] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId: assignment.courseId, status: { not: 'cancelled' } },
        select: { userId: true },
      }),
      this.prisma.assignmentSubmission.findMany({ where: { assignmentId } }),
    ]);
    const studentIds = [...new Set([...enrollments.map((e) => e.userId), ...subs.map((s) => s.userId)])];
    const [profiles, emails] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } }),
      this.emailsFor(studentIds),
    ]);
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    const subBy = new Map(subs.map((s) => [s.userId, s]));

    const rows: SubmissionRow[] = studentIds.map((studentId) => {
      const s = subBy.get(studentId);
      const handedIn = Boolean(s?.submittedAt);
      return {
        submissionId: handedIn ? (s?.id ?? null) : null,
        studentId,
        studentName: names.get(studentId) ?? null,
        studentEmail: emails.get(studentId) ?? null,
        status: s?.gradedAt ? 'graded' : handedIn ? 'submitted' : 'not_submitted',
        submittedAt: s?.submittedAt?.toISOString() ?? null,
        note: s?.note ?? null,
        hasFile: Boolean(s?.fileKey),
        fileName: s?.fileKey ? (s.fileKey.split('/').pop() ?? null) : null,
        grade: s?.grade ?? null,
        feedback: s?.feedback ?? null,
        gradedAt: s?.gradedAt?.toISOString() ?? null,
      };
    });
    const rank = { submitted: 0, graded: 1, not_submitted: 2 } as const;
    rows.sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '') ||
        (a.studentName ?? '').localeCompare(b.studentName ?? ''),
    );

    const list = await this.assignments(instructorId, assignment.courseId);
    return { assignment: list.find((a) => a.id === assignmentId) as InstructorAssignment, rows };
  }

  async grade(instructorId: string, submissionId: string, dto: GradeDto) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, userId: true, submittedAt: true, assignment: { select: { courseId: true, title: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    await this.assertTeaches(instructorId, submission.assignment.courseId);
    if (!submission.submittedAt) throw new BadRequestException('Nothing has been handed in yet, so there is nothing to grade.');

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: dto.grade.trim(), feedback: dto.feedback?.trim() || null, gradedAt: new Date() },
      select: { grade: true, feedback: true, gradedAt: true },
    });
    await this.prisma.notification.create({
      data: {
        userId: submission.userId,
        kind: 'assignment',
        title: `Your assignment was graded: ${submission.assignment.title}`,
        body: updated.feedback ? `Grade: ${updated.grade} -- ${updated.feedback}` : `Grade: ${updated.grade}`,
        href: '/portal/assignments',
      },
    });
    return { grade: updated.grade as string, feedback: updated.feedback, gradedAt: (updated.gradedAt as Date).toISOString() };
  }

  /**
   * A short-lived link to the file a student uploaded. Students set their own
   * `fileKey` when submitting, so the key is only trusted if it sits under
   * that student's own folder for this assignment -- otherwise a student could
   * point a submission at somebody else's file and have the instructor open it.
   */
  async fileLink(instructorId: string, submissionId: string): Promise<{ url: string; fileName: string }> {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: { userId: true, assignmentId: true, fileKey: true, assignment: { select: { courseId: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    await this.assertTeaches(instructorId, submission.assignment.courseId);
    if (!submission.fileKey) throw new NotFoundException('This submission has no file.');
    if (!submission.fileKey.startsWith(`${submission.userId}/${submission.assignmentId}/`)) {
      throw new ForbiddenException('This file does not belong to that student.');
    }
    const url = await this.supabase.signStorageUrl(SUBMISSIONS_BUCKET, submission.fileKey, FILE_LINK_SECONDS);
    return { url, fileName: submission.fileKey.split('/').pop() ?? 'submission' };
  }

  async gradingQueue(instructorId: string): Promise<GradingItem[]> {
    return this.queue(await this.courseIds(instructorId), 100);
  }

  // ---- announcements ----

  async announcements(instructorId: string, courseId: string): Promise<InstructorAnnouncement[]> {
    await this.assertTeaches(instructorId, courseId);
    const rows = await this.prisma.announcement.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(toAnnouncement);
  }

  async createAnnouncement(instructorId: string, courseId: string, dto: CreateAnnouncementDto): Promise<InstructorAnnouncement> {
    await this.assertTeaches(instructorId, courseId);
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    const recipientCount = await this.notifyEnrolled(courseId, {
      kind: 'course',
      title: `${course?.title ?? 'Your course'}: ${dto.title.trim()}`,
      body: dto.body.trim().slice(0, 500),
      href: '/portal/courses',
    });
    const row = await this.prisma.announcement.create({
      data: { courseId, authorId: instructorId, title: dto.title.trim(), body: dto.body.trim(), recipientCount },
    });
    return toAnnouncement(row);
  }

  // ---- helpers ----

  private parseDue(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('That due date is not valid.');
    return d;
  }

  /** In-portal notification to every active student enrolled in the course. Returns how many were told. */
  private async notifyEnrolled(
    courseId: string,
    n: { kind: 'assignment' | 'course'; title: string; body: string; href: string },
  ): Promise<number> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId, status: { not: 'cancelled' } },
      select: { userId: true },
    });
    const active = await this.prisma.profile.findMany({
      where: { id: { in: enrollments.map((e) => e.userId) }, status: 'active' },
      select: { id: true },
    });
    if (active.length === 0) return 0;
    await this.prisma.notification.createMany({
      data: active.map((p) => ({ userId: p.id, kind: n.kind, title: n.title, body: n.body, href: n.href })),
    });
    return active.length;
  }

  private async queue(courseIds: string[], take: number): Promise<GradingItem[]> {
    if (courseIds.length === 0) return [];
    const rows = await this.prisma.assignmentSubmission.findMany({
      where: { submittedAt: { not: null }, gradedAt: null, assignment: { courseId: { in: courseIds } } },
      orderBy: { submittedAt: 'asc' },
      take,
      select: {
        id: true,
        userId: true,
        assignmentId: true,
        submittedAt: true,
        assignment: { select: { title: true, course: { select: { title: true } } } },
      },
    });
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: { id: true, name: true },
    });
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    return rows.map((r) => ({
      submissionId: r.id,
      assignmentId: r.assignmentId,
      assignmentTitle: r.assignment.title,
      courseTitle: r.assignment.course.title,
      studentName: names.get(r.userId) ?? null,
      submittedAt: (r.submittedAt as Date).toISOString(),
    }));
  }

  private async emailsFor(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(ids.map((i) => Prisma.sql`${i}::uuid`))})`;
    return new Map(rows.filter((r) => r.email).map((r) => [r.id, r.email as string]));
  }
}

function toAnnouncement(row: {
  id: string;
  courseId: string | null;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: Date;
}): InstructorAnnouncement {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    body: row.body,
    recipientCount: row.recipientCount,
    createdAt: row.createdAt.toISOString(),
  };
}
