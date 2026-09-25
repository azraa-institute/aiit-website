import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminDashboard,
  AuditLogEntry,
  InstructorSummary,
  Paginated,
  StaffCredentials,
  StudentDetail,
  StudentSummary,
  SuspendResult,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SupabaseAdminService, generateTemporaryPassword } from '../../common/supabase-admin/supabase-admin.service';
import type { CreateInstructorDto, ListStudentsQueryDto } from './dto/admin.dto';

const DAY = 86_400_000;
const AUDIT_PAGE_SIZE = 50;

interface StudentRow {
  id: string;
  name: string | null;
  email: string | null;
  country: string | null;
  status: StudentSummary['status'];
  created_at: Date;
  enrolled: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
    private readonly audit: AuditService,
  ) {}

  // ---- Dashboard ----

  async dashboard(): Promise<AdminDashboard> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const weekAhead = new Date(now.getTime() + 7 * DAY);

    const [byRole, newThisWeek, courses, liveNow, upcomingWeek, openComplaints] = await Promise.all([
      this.prisma.profile.groupBy({ by: ['role', 'status'], _count: { _all: true } }),
      this.prisma.profile.count({ where: { role: 'learner', createdAt: { gte: weekAgo } } }),
      this.prisma.course.findMany({
        where: { status: 'published', deletedAt: null },
        select: {
          id: true,
          slug: true,
          title: true,
          _count: { select: { enrollments: { where: { status: { not: 'cancelled' } } } } },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.liveClass.count({ where: { status: 'live' } }),
      this.prisma.liveClass.count({ where: { status: 'scheduled', startsAt: { gte: now, lte: weekAhead } } }),
      this.prisma.complaint.count({ where: { status: { in: ['open', 'in_review'] } } }),
    ]);

    const count = (role: string, status?: string) =>
      byRole
        .filter((r) => r.role === role && (!status || r.status === status))
        .reduce((sum, r) => sum + r._count._all, 0);

    return {
      students: {
        total: count('learner'),
        active: count('learner', 'active'),
        suspended: count('learner', 'suspended'),
        newThisWeek,
      },
      instructors: { total: count('instructor'), active: count('instructor', 'active'), suspended: count('instructor', 'suspended') },
      courses: courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title, enrolled: c._count.enrollments })),
      classes: { liveNow, upcomingWeek },
      complaints: { open: openComplaints },
    };
  }

  // ---- Students ----

  async listStudents(query: ListStudentsQueryDto): Promise<Paginated<StudentSummary>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const conditions: Prisma.Sql[] = [Prisma.sql`p.role = 'learner'`];
    if (query.status) conditions.push(Prisma.sql`p.status = ${query.status}::"ProfileStatus"`);
    if (query.q?.trim()) {
      const like = `%${query.q.trim().replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(Prisma.sql`(p.name ILIKE ${like} OR u.email ILIKE ${like})`);
    }
    if (query.courseId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = p.id AND e.course_id = ${query.courseId}::uuid AND e.status <> 'cancelled')`,
      );
    }
    const where = Prisma.join(conditions, ' AND ');

    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<StudentRow[]>`
        SELECT p.id, p.name, u.email, p.country, p.status, p.created_at,
               (SELECT count(*) FROM enrollments e WHERE e.user_id = p.id AND e.status <> 'cancelled')::int AS enrolled
        FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE ${where}`,
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        country: r.country,
        status: r.status,
        joinedAt: r.created_at.toISOString(),
        enrolledCourses: r.enrolled,
      })),
      total: totals[0]?.total ?? 0,
      page,
      pageSize,
    };
  }

  async studentDetail(id: string): Promise<StudentDetail> {
    const profile = await this.prisma.profile.findFirst({ where: { id, role: 'learner' } });
    if (!profile) throw new NotFoundException('Student not found.');
    const [emails, enrollments, attended] = await Promise.all([
      this.emailsFor([id]),
      this.prisma.enrollment.findMany({
        where: { userId: id },
        select: { status: true, enrolledAt: true, course: { select: { id: true, title: true } } },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.liveClassAttendance.count({ where: { userId: id } }),
    ]);
    return {
      id: profile.id,
      name: profile.name,
      email: emails.get(id) ?? null,
      country: profile.country,
      status: profile.status,
      joinedAt: profile.createdAt.toISOString(),
      enrolledCourses: enrollments.filter((e) => e.status !== 'cancelled').length,
      phone: profile.phone,
      timeZone: profile.timeZone,
      suspendedAt: profile.suspendedAt?.toISOString() ?? null,
      suspendedReason: profile.suspendedReason,
      enrollments: enrollments.map((e) => ({
        courseId: e.course.id,
        courseTitle: e.course.title,
        status: e.status,
        enrolledAt: e.enrolledAt.toISOString(),
      })),
      attendance: { attended },
    };
  }

  // ---- Instructors ----

  async listInstructors(): Promise<InstructorSummary[]> {
    const profiles = await this.prisma.profile.findMany({ where: { role: 'instructor' }, orderBy: { name: 'asc' } });
    return this.toInstructorSummaries(profiles);
  }

  async createInstructor(adminId: string, dto: CreateInstructorDto): Promise<StaffCredentials> {
    const email = dto.email.trim().toLowerCase();
    const password = generateTemporaryPassword();
    const userId = await this.supabase.createUser(email, password, dto.name.trim());

    // The on_auth_user_created trigger has already inserted a 'learner' profile; upsert covers the case where it hasn't.
    const data = {
      role: 'instructor' as const,
      name: dto.name.trim(),
      headline: dto.headline?.trim() || null,
      mustChangePassword: true,
      createdBy: adminId,
    };
    const profile = await this.prisma.profile.upsert({ where: { id: userId }, create: { id: userId, ...data }, update: data });
    await this.audit.record(adminId, 'instructor.create', 'user', userId, { email });

    const [summary] = await this.toInstructorSummaries([profile], new Map([[userId, email]]));
    return { instructor: summary, temporaryPassword: password };
  }

  async resetInstructorPassword(adminId: string, id: string): Promise<StaffCredentials> {
    const profile = await this.prisma.profile.findFirst({ where: { id, role: 'instructor' } });
    if (!profile) throw new NotFoundException('Instructor not found.');
    const password = generateTemporaryPassword();
    await this.supabase.setPassword(id, password);
    const updated = await this.prisma.profile.update({ where: { id }, data: { mustChangePassword: true } });
    await this.audit.record(adminId, 'instructor.reset_password', 'user', id);
    const [summary] = await this.toInstructorSummaries([updated]);
    return { instructor: summary, temporaryPassword: password };
  }

  // ---- Suspension (students + instructors) ----

  async suspend(adminId: string, id: string, reason: string): Promise<SuspendResult> {
    const target = await this.suspendableTarget(adminId, id);
    if (target.status !== 'active') throw new ConflictException('Only an active account can be suspended.');

    await this.prisma.profile.update({
      where: { id },
      data: { status: 'suspended', suspendedAt: new Date(), suspendedReason: reason.trim() },
    });
    await this.supabase.tryBan(id, true);
    await this.audit.record(adminId, 'user.suspend', 'user', id, { role: target.role, reason: reason.trim() });
    return { id, status: 'suspended', affectedUpcomingClasses: await this.upcomingClassesFor(id) };
  }

  async reactivate(adminId: string, id: string): Promise<SuspendResult> {
    const target = await this.suspendableTarget(adminId, id);
    // pending_deletion is the user's own request, not an admin suspension -- not reversible from here.
    if (target.status !== 'suspended') throw new ConflictException('Only a suspended account can be reactivated.');

    await this.prisma.profile.update({
      where: { id },
      data: { status: 'active', suspendedAt: null, suspendedReason: null },
    });
    await this.supabase.tryBan(id, false);
    await this.audit.record(adminId, 'user.reactivate', 'user', id, { role: target.role });
    return { id, status: 'active', affectedUpcomingClasses: 0 };
  }

  // ---- Audit log ----

  async auditLog(page = 1): Promise<Paginated<AuditLogEntry>> {
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
      }),
      this.prisma.auditLog.count(),
    ]);
    const actors = await this.prisma.profile.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.actorId))] } },
      select: { id: true, name: true },
    });
    const names = new Map(actors.map((a) => [a.id, a.name]));
    return {
      items: rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        actorName: names.get(r.actorId) ?? null,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        metadata: r.metadata as Record<string, unknown>,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize: AUDIT_PAGE_SIZE,
    };
  }

  // ---- helpers ----

  private async suspendableTarget(adminId: string, id: string) {
    if (id === adminId) throw new ForbiddenException('You cannot change your own account this way.');
    const target = await this.prisma.profile.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!target) throw new NotFoundException('Account not found.');
    if (target.role === 'admin') throw new BadRequestException('Administrator accounts cannot be suspended here.');
    return target;
  }

  private upcomingClassesFor(hostUserId: string): Promise<number> {
    return this.prisma.liveClass.count({
      where: { hostUserId, status: 'scheduled', startsAt: { gt: new Date() } },
    });
  }

  private async emailsFor(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(ids.map((i) => Prisma.sql`${i}::uuid`))})`;
    return new Map(rows.filter((r) => r.email).map((r) => [r.id, r.email as string]));
  }

  private async toInstructorSummaries(
    profiles: { id: string; name: string | null; headline: string | null; status: InstructorSummary['status']; createdAt: Date; suspendedReason: string | null }[],
    knownEmails?: Map<string, string>,
  ): Promise<InstructorSummary[]> {
    const emails = knownEmails ?? (await this.emailsFor(profiles.map((p) => p.id)));
    const upcoming = await this.prisma.liveClass.groupBy({
      by: ['hostUserId'],
      where: { hostUserId: { in: profiles.map((p) => p.id) }, status: 'scheduled', startsAt: { gt: new Date() } },
      _count: { _all: true },
    });
    const counts = new Map(upcoming.map((u) => [u.hostUserId, u._count._all]));
    return profiles.map((p) => ({
      id: p.id,
      name: p.name,
      email: emails.get(p.id) ?? null,
      headline: p.headline,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      suspendedReason: p.suspendedReason,
      upcomingClasses: counts.get(p.id) ?? 0,
    }));
  }
}
