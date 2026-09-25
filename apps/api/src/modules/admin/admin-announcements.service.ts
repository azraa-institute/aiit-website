import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminAnnouncement, AnnouncementAudience } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

interface CreateInput {
  audience: AnnouncementAudience;
  courseId?: string;
  title: string;
  body: string;
}

/**
 * Admin -> everyone: all students, one course's students, or all instructors.
 * Students get an in-portal notification; instructors read theirs on their
 * dashboard (the instructor portal has no notification bell).
 */
@Injectable()
export class AdminAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminAnnouncement[]> {
    const rows = await this.prisma.announcement.findMany({
      where: { audience: { in: ['all_students', 'course', 'instructors'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { course: { select: { title: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      audience: r.audience as AnnouncementAudience,
      courseTitle: r.course?.title ?? null,
      title: r.title,
      body: r.body,
      recipientCount: r.recipientCount,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(adminId: string, input: CreateInput): Promise<AdminAnnouncement> {
    let courseTitle: string | null = null;
    let recipientIds: string[] = [];

    if (input.audience === 'course') {
      if (!input.courseId) throw new BadRequestException('Choose the course this is for.');
      const course = await this.prisma.course.findFirst({ where: { id: input.courseId, deletedAt: null }, select: { title: true } });
      if (!course) throw new NotFoundException('Course not found.');
      courseTitle = course.title;
      const enrolled = await this.prisma.enrollment.findMany({
        where: { courseId: input.courseId, status: { not: 'cancelled' } },
        select: { userId: true },
      });
      recipientIds = await this.activeIds(enrolled.map((e) => e.userId));
    } else if (input.audience === 'all_students') {
      recipientIds = (await this.prisma.profile.findMany({ where: { role: 'learner', status: 'active' }, select: { id: true } })).map((p) => p.id);
    } else {
      recipientIds = (await this.prisma.profile.findMany({ where: { role: 'instructor', status: 'active' }, select: { id: true } })).map((p) => p.id);
    }

    if (input.audience !== 'instructors' && recipientIds.length > 0) {
      await this.prisma.notification.createMany({
        data: recipientIds.map((userId) => ({
          userId,
          kind: input.audience === 'course' ? ('course' as const) : ('system' as const),
          title: courseTitle ? `${courseTitle}: ${input.title.trim()}` : input.title.trim(),
          body: input.body.trim().slice(0, 500),
          href: '/portal/notifications',
        })),
      });
    }

    const row = await this.prisma.announcement.create({
      data: {
        courseId: input.courseId ?? null,
        authorId: adminId,
        audience: input.audience,
        title: input.title.trim(),
        body: input.body.trim(),
        recipientCount: recipientIds.length,
      },
    });
    await this.audit.record(adminId, 'announcement.create', 'announcement', row.id, {
      audience: input.audience,
      recipients: recipientIds.length,
    });
    return {
      id: row.id,
      audience: input.audience,
      courseTitle,
      title: row.title,
      body: row.body,
      recipientCount: row.recipientCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async activeIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.profile.findMany({ where: { id: { in: ids }, status: 'active' }, select: { id: true } });
    return rows.map((r) => r.id);
  }
}
