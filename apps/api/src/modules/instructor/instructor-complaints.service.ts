import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Complaint } from '@prisma/client';
import type { InstructorComplaintDetail, InstructorComplaintOptions, InstructorComplaintSummary } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateInstructorComplaintDto } from './dto/instructor-complaints.dto';

/** A reply on a resolved complaint puts it back in the queue, same as the student side. */
const REOPENS = ['resolved'];

/**
 * An instructor's own side of complaints -- reports they file about a
 * student. Reuses the same `complaints` table as student support
 * (SupportService) and the admin inbox (AdminComplaintsService), tagged
 * filerRole: 'instructor' and category: 'student', so everything still
 * lands in one place for admins to triage. Every method is scoped to the
 * caller's own filed complaints and to students enrolled in a course they
 * teach -- an instructor never sees another instructor's reports or reports
 * a student outside their own courses.
 */
@Injectable()
export class InstructorComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async options(instructorId: string): Promise<InstructorComplaintOptions> {
    const courseIds = await this.courseIds(instructorId);
    if (courseIds.length === 0) return { courses: [] };

    const [courses, enrollments] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      this.prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, status: { not: 'cancelled' } },
        select: { courseId: true, userId: true },
      }),
    ]);
    const names = await this.names(enrollments.map((e) => e.userId));
    const byCourse = new Map<string, { id: string; name: string | null }[]>();
    for (const e of enrollments) {
      const list = byCourse.get(e.courseId) ?? [];
      list.push({ id: e.userId, name: names.get(e.userId) ?? null });
      byCourse.set(e.courseId, list);
    }
    return {
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        students: (byCourse.get(c.id) ?? []).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      })),
    };
  }

  async create(instructorId: string, dto: CreateInstructorComplaintDto): Promise<InstructorComplaintSummary> {
    if (dto.courseId) {
      await this.assertTeaches(instructorId, dto.courseId);
      const enrolled = await this.prisma.enrollment.findFirst({
        where: { userId: dto.studentId, courseId: dto.courseId, status: { not: 'cancelled' } },
        select: { id: true },
      });
      if (!enrolled) throw new BadRequestException('That student is not enrolled in the selected course.');
    } else {
      const courseIds = await this.courseIds(instructorId);
      const enrolled = await this.prisma.enrollment.findFirst({
        where: { userId: dto.studentId, courseId: { in: courseIds }, status: { not: 'cancelled' } },
        select: { id: true },
      });
      if (!enrolled) throw new ForbiddenException('You can only report a student enrolled in one of your courses.');
    }

    const created = await this.prisma.complaint.create({
      data: {
        userId: instructorId,
        filerRole: 'instructor',
        category: 'student',
        targetStudentId: dto.studentId,
        courseId: dto.courseId ?? null,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
      },
    });
    return (await this.summaries([created]))[0];
  }

  async list(instructorId: string): Promise<InstructorComplaintSummary[]> {
    const rows = await this.prisma.complaint.findMany({
      where: { userId: instructorId, filerRole: 'instructor' },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return this.summaries(rows);
  }

  async detail(instructorId: string, id: string): Promise<InstructorComplaintDetail> {
    const row = await this.ownComplaint(instructorId, id);
    const [summary] = await this.summaries([row]);
    const messages = await this.prisma.complaintMessage.findMany({
      where: { complaintId: id, internal: false },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ...summary,
      body: row.body,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.authorRole === 'admin' ? 'admin' : 'instructor',
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async reply(instructorId: string, id: string, body: string): Promise<InstructorComplaintDetail> {
    const row = await this.ownComplaint(instructorId, id);
    if (row.status === 'dismissed') {
      throw new ConflictException('This report was closed. Please file a new one if the problem continues.');
    }
    await this.prisma.$transaction([
      this.prisma.complaintMessage.create({ data: { complaintId: id, authorId: instructorId, authorRole: 'instructor', body: body.trim() } }),
      this.prisma.complaint.update({
        where: { id },
        data: REOPENS.includes(row.status) ? { status: 'open', resolvedAt: null, resolvedBy: null } : { updatedAt: new Date() },
      }),
    ]);
    return this.detail(instructorId, id);
  }

  // ---- helpers ----

  private async courseIds(instructorId: string): Promise<string[]> {
    const rows = await this.prisma.courseInstructor.findMany({ where: { instructorId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  private async assertTeaches(instructorId: string, courseId: string): Promise<void> {
    const row = await this.prisma.courseInstructor.findUnique({
      where: { courseId_instructorId: { courseId, instructorId } },
      select: { courseId: true },
    });
    if (!row) throw new ForbiddenException('You do not teach this course.');
  }

  private async ownComplaint(instructorId: string, id: string): Promise<Complaint> {
    const row = await this.prisma.complaint.findUnique({ where: { id } });
    // Someone else's report (or a student's own complaint) looks exactly like one that does not exist.
    if (!row || row.userId !== instructorId || row.filerRole !== 'instructor') throw new NotFoundException('Report not found.');
    return row;
  }

  private async names(ids: string[]): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.profile.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async summaries(rows: Complaint[]): Promise<InstructorComplaintSummary[]> {
    if (rows.length === 0) return [];
    const courseIds = [...new Set(rows.map((r) => r.courseId).filter((v): v is string => Boolean(v)))];
    const studentIds = [...new Set(rows.map((r) => r.targetStudentId).filter((v): v is string => Boolean(v)))];
    const [courses, names, replyCounts] = await Promise.all([
      courseIds.length
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      this.names(studentIds),
      this.prisma.complaintMessage.groupBy({
        by: ['complaintId'],
        where: { complaintId: { in: rows.map((r) => r.id) }, internal: false, authorRole: 'admin' },
        _count: { _all: true },
      }),
    ]);
    const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
    const replies = new Map(replyCounts.map((r) => [r.complaintId, r._count._all]));
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      subject: r.subject,
      studentName: r.targetStudentId ? (names.get(r.targetStudentId) ?? null) : null,
      courseTitle: r.courseId ? (courseTitle.get(r.courseId) ?? null) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      replies: replies.get(r.id) ?? 0,
    }));
  }
}
