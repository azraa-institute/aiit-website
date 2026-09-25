import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminComplaintDetail, AdminComplaintSummary, ComplaintStatus, Paginated } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

const PAGE_SIZE = 25;

interface ListQuery {
  status?: ComplaintStatus;
  category?: string;
  page?: number;
}

/**
 * The admin inbox for student complaints. Complaints are readable ONLY here --
 * no instructor endpoint exposes them, so a complaint about an instructor never
 * reaches that instructor.
 */
@Injectable()
export class AdminComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery): Promise<Paginated<AdminComplaintSummary>> {
    const page = query.page ?? 1;
    const where: Prisma.ComplaintWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category as never } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { _count: { select: { messages: true } }, course: { select: { title: true } } },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    const names = await this.names(rows.flatMap((r) => [r.userId, r.instructorId].filter((v): v is string => Boolean(v))));
    return {
      items: rows.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        subject: r.subject,
        studentId: r.userId,
        studentName: names.get(r.userId) ?? null,
        courseTitle: r.course?.title ?? null,
        instructorId: r.instructorId,
        instructorName: r.instructorId ? (names.get(r.instructorId) ?? null) : null,
        messageCount: r._count.messages,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async detail(id: string): Promise<AdminComplaintDetail> {
    const row = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        course: { select: { title: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Complaint not found.');
    const names = await this.names([row.userId, row.instructorId, ...row.messages.map((m) => m.authorId)].filter((v): v is string => Boolean(v)));
    const email = await this.email(row.userId);
    return {
      id: row.id,
      category: row.category,
      status: row.status,
      subject: row.subject,
      body: row.body,
      studentId: row.userId,
      studentName: names.get(row.userId) ?? null,
      studentEmail: email,
      courseTitle: row.course?.title ?? null,
      instructorId: row.instructorId,
      instructorName: row.instructorId ? (names.get(row.instructorId) ?? null) : null,
      messageCount: row.messages.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      messages: row.messages.map((m) => ({
        id: m.id,
        authorRole: m.authorRole === 'admin' ? 'admin' : 'student',
        authorName: names.get(m.authorId) ?? null,
        body: m.body,
        internal: m.internal,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /** A reply the student sees (and is notified about), or an internal note only admins see. */
  async reply(adminId: string, id: string, body: string, internal: boolean): Promise<AdminComplaintDetail> {
    const row = await this.prisma.complaint.findUnique({ where: { id }, select: { userId: true, subject: true, status: true } });
    if (!row) throw new NotFoundException('Complaint not found.');

    await this.prisma.complaintMessage.create({
      data: { complaintId: id, authorId: adminId, authorRole: 'admin', body: body.trim(), internal },
    });
    if (!internal) {
      // First real reply moves it out of the "new" pile.
      await this.prisma.complaint.update({
        where: { id },
        data: row.status === 'open' ? { status: 'in_review' } : { updatedAt: new Date() },
      });
      await this.prisma.notification.create({
        data: {
          userId: row.userId,
          kind: 'system',
          title: `The AIIT team replied to your report: ${row.subject}`,
          body: body.trim().slice(0, 300),
          href: '/portal/support',
        },
      });
    }
    await this.audit.record(adminId, internal ? 'complaint.note' : 'complaint.reply', 'complaint', id);
    return this.detail(id);
  }

  async setStatus(adminId: string, id: string, status: ComplaintStatus): Promise<AdminComplaintDetail> {
    const row = await this.prisma.complaint.findUnique({ where: { id }, select: { userId: true, subject: true, status: true } });
    if (!row) throw new NotFoundException('Complaint not found.');
    const closing = status === 'resolved' || status === 'dismissed';
    await this.prisma.complaint.update({
      where: { id },
      data: { status, resolvedAt: closing ? new Date() : null, resolvedBy: closing ? adminId : null },
    });
    if (closing && row.status !== status) {
      await this.prisma.notification.create({
        data: {
          userId: row.userId,
          kind: 'system',
          title: status === 'resolved' ? `Your report was resolved: ${row.subject}` : `Your report was closed: ${row.subject}`,
          body: 'Open Support to read the details or reply.',
          href: '/portal/support',
        },
      });
    }
    await this.audit.record(adminId, 'complaint.status', 'complaint', id, { from: row.status, to: status });
    return this.detail(id);
  }

  private async names(ids: string[]): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.profile.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async email(userId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ email: string | null }[]>`SELECT email FROM auth.users WHERE id = ${userId}::uuid`;
    return rows[0]?.email ?? null;
  }
}
