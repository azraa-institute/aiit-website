import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Complaint, ComplaintStatus as DbComplaintStatus } from '@prisma/client';
import type { ComplaintDetail, ComplaintOptions, ComplaintSummary } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateComplaintDto } from './dto/support.dto';

/** Where a reopened complaint goes: a reply on a resolved complaint puts it back in the queue. */
const REOPENS: DbComplaintStatus[] = ['resolved'];

/**
 * The student's side of support. Everything is scoped to the caller's own
 * complaints, and internal admin notes are filtered out of every response.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** The form's choices: only the caller's enrolled courses, and who teaches each. */
  async options(userId: string): Promise<ComplaintOptions> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: { not: 'cancelled' } },
      select: { course: { select: { id: true, title: true, instructors: { select: { instructorId: true } } } } },
    });
    const ids = [...new Set(enrollments.flatMap((e) => e.course.instructors.map((i) => i.instructorId)))];
    const names = await this.names(ids);
    return {
      courses: enrollments.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        instructors: e.course.instructors.map((i) => ({ id: i.instructorId, name: names.get(i.instructorId) ?? null })),
      })),
    };
  }

  async create(userId: string, dto: CreateComplaintDto): Promise<ComplaintSummary> {
    if (dto.instructorId && !dto.courseId) {
      throw new BadRequestException('Choose the course this instructor teaches you on.');
    }
    if (dto.category === 'instructor' && !dto.instructorId) {
      throw new BadRequestException('Choose which instructor this is about.');
    }
    if (dto.courseId) {
      const enrolled = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: dto.courseId, status: { not: 'cancelled' } },
        select: { id: true },
      });
      if (!enrolled) throw new ForbiddenException('You can only report on a course you are enrolled in.');
    }
    if (dto.instructorId && dto.courseId) {
      const teaches = await this.prisma.courseInstructor.findUnique({
        where: { courseId_instructorId: { courseId: dto.courseId, instructorId: dto.instructorId } },
        select: { courseId: true },
      });
      if (!teaches) throw new BadRequestException('That instructor does not teach the selected course.');
    }

    const created = await this.prisma.complaint.create({
      data: {
        userId,
        category: dto.category,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        courseId: dto.courseId ?? null,
        instructorId: dto.instructorId ?? null,
      },
    });
    return (await this.summaries([created]))[0];
  }

  async list(userId: string): Promise<ComplaintSummary[]> {
    const rows = await this.prisma.complaint.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 100 });
    return this.summaries(rows);
  }

  async detail(userId: string, id: string): Promise<ComplaintDetail> {
    const row = await this.ownComplaint(userId, id);
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
        from: m.authorRole === 'admin' ? 'admin' : 'student',
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async reply(userId: string, id: string, body: string): Promise<ComplaintDetail> {
    const row = await this.ownComplaint(userId, id);
    if (row.status === 'dismissed') {
      throw new ConflictException('This report was closed. Please open a new one if the problem continues.');
    }
    await this.prisma.$transaction([
      this.prisma.complaintMessage.create({ data: { complaintId: id, authorId: userId, authorRole: 'student', body: body.trim() } }),
      this.prisma.complaint.update({
        where: { id },
        data: REOPENS.includes(row.status) ? { status: 'open', resolvedAt: null, resolvedBy: null } : { updatedAt: new Date() },
      }),
    ]);
    return this.detail(userId, id);
  }

  // ---- helpers ----

  private async ownComplaint(userId: string, id: string): Promise<Complaint> {
    const row = await this.prisma.complaint.findUnique({ where: { id } });
    // Someone else's complaint looks exactly like one that does not exist.
    if (!row || row.userId !== userId) throw new NotFoundException('Report not found.');
    return row;
  }

  private async names(ids: string[]): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async summaries(rows: Complaint[]): Promise<ComplaintSummary[]> {
    if (rows.length === 0) return [];
    const courseIds = [...new Set(rows.map((r) => r.courseId).filter((v): v is string => Boolean(v)))];
    const [courses, names, replyCounts] = await Promise.all([
      courseIds.length
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      this.names(rows.map((r) => r.instructorId).filter((v): v is string => Boolean(v))),
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
      category: r.category,
      status: r.status,
      subject: r.subject,
      courseTitle: r.courseId ? (courseTitle.get(r.courseId) ?? null) : null,
      instructorName: r.instructorId ? (names.get(r.instructorId) ?? null) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      replies: replies.get(r.id) ?? 0,
    }));
  }
}
