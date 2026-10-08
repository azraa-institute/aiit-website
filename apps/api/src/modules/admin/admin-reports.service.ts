import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminOrderRow, AdminOrderStatus, AdminPaymentProvider, AttendanceReportRow, Paginated, PaymentsSummary, RevenueByCurrency } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildXlsx } from '../../common/xlsx';

export interface ListOrdersQuery {
  page?: number;
  status?: AdminOrderStatus;
  provider?: AdminPaymentProvider;
  courseId?: string;
}

/** Attendance figures and .xlsx exports for the admin portal. */
@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every class that has started (or is over), newest first, with how many enrolled students actually joined. */
  async attendance(courseId?: string): Promise<AttendanceReportRow[]> {
    const classes = await this.prisma.liveClass.findMany({
      where: { startsAt: { lte: new Date() }, ...(courseId ? { courseId } : {}) },
      orderBy: { startsAt: 'desc' },
      take: 500,
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true,
        hostUserId: true,
        courseId: true,
        course: { select: { title: true } },
        _count: { select: { attendance: true } },
      },
    });
    const courseIds = [...new Set(classes.map((c) => c.courseId))];
    const [enrolled, hosts] = await Promise.all([
      courseIds.length
        ? this.prisma.enrollment.groupBy({
            by: ['courseId'],
            where: { courseId: { in: courseIds }, status: { not: 'cancelled' } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      this.hostNames(classes.map((c) => c.hostUserId)),
    ]);
    const enrolledBy = new Map(enrolled.map((e) => [e.courseId, e._count._all]));
    return classes.map((c) => ({
      classId: c.id,
      title: c.title,
      courseTitle: c.course.title,
      startsAt: c.startsAt.toISOString(),
      status: c.status,
      hostName: c.hostUserId ? (hosts.get(c.hostUserId) ?? null) : null,
      enrolled: enrolledBy.get(c.courseId) ?? 0,
      attended: c._count.attendance,
    }));
  }

  // ---- Payments / revenue ----
  // Orders settle in whichever currency their provider uses (PayPal: USD,
  // Razorpay: INR, Paystack: NGN) -- every aggregate here is grouped by
  // currency, never summed across currencies into one number that would
  // misrepresent the actual revenue.

  async payments(): Promise<PaymentsSummary> {
    const [byStatus, byCurrency, byProviderCurrency, byCourseCurrency] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['currency'], where: { status: 'paid' }, _sum: { amountCents: true }, _count: { _all: true } }),
      this.prisma.order.groupBy({
        by: ['provider', 'currency'],
        where: { status: 'paid' },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['courseId', 'currency'],
        where: { status: 'paid' },
        _sum: { amountCents: true },
        _count: { _all: true },
        orderBy: { _count: { courseId: 'desc' } },
      }),
    ]);

    const ordersByStatus: Record<AdminOrderStatus, number> = { pending: 0, paid: 0, failed: 0, refunded: 0, cancelled: 0 };
    for (const row of byStatus) ordersByStatus[row.status] = row._count._all;

    const revenueByCurrency: RevenueByCurrency[] = byCurrency.map((r) => ({
      currency: r.currency,
      amountCents: r._sum.amountCents ?? 0,
      orders: r._count._all,
    }));

    const ordersByProvider = byProviderCurrency.map((r) => ({
      provider: r.provider as AdminPaymentProvider,
      currency: r.currency,
      amountCents: r._sum.amountCents ?? 0,
      orders: r._count._all,
    }));

    const courseIds = [...new Set(byCourseCurrency.map((r) => r.courseId))].slice(0, 10);
    const courses =
      courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));
    const topCourses = courseIds.map((courseId) => ({
      courseId,
      courseTitle: courseTitleById.get(courseId) ?? 'Unknown course',
      revenueByCurrency: byCourseCurrency
        .filter((r) => r.courseId === courseId)
        .map((r) => ({ currency: r.currency, amountCents: r._sum.amountCents ?? 0, orders: r._count._all })),
    }));

    return { revenueByCurrency, ordersByStatus, ordersByProvider, topCourses };
  }

  async orders(query: ListOrdersQuery): Promise<Paginated<AdminOrderRow>> {
    const page = query.page ?? 1;
    const pageSize = 25;
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { course: { select: { title: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length > 0 ? await this.userNamesAndEmails(userIds) : new Map<string, { name: string | null; email: string | null }>();

    return {
      items: rows.map((r) => {
        const u = users.get(r.userId);
        return {
          id: r.id,
          userName: u?.name ?? null,
          userEmail: u?.email ?? null,
          courseId: r.courseId,
          courseTitle: r.course.title,
          provider: r.provider as AdminPaymentProvider,
          currency: r.currency,
          amountCents: r.amountCents,
          status: r.status as AdminOrderStatus,
          createdAt: r.createdAt.toISOString(),
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async paymentsXlsx(): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<
      {
        course: string;
        provider: string;
        currency: string;
        amount_cents: number;
        status: string;
        name: string | null;
        email: string | null;
        created_at: Date;
        paid_at: Date | null;
      }[]
    >`
      SELECT c.title AS course, o.provider, o.currency, o.amount_cents, o.status, p.name, u.email, o.created_at, o.paid_at
      FROM orders o
      JOIN courses c ON c.id = o.course_id
      LEFT JOIN profiles p ON p.id = o.user_id
      LEFT JOIN auth.users u ON u.id = o.user_id
      ORDER BY o.created_at DESC`;
    return buildXlsx(
      'Payments',
      ['Course', 'Provider', 'Currency', 'Amount (minor units)', 'Status', 'Student', 'Email', 'Created', 'Paid'],
      rows.map((r) => [r.course, r.provider, r.currency, r.amount_cents, r.status, r.name, r.email, r.created_at, r.paid_at]),
    );
  }

  private async userNamesAndEmails(ids: string[]): Promise<Map<string, { name: string | null; email: string | null }>> {
    const rows = await this.prisma.$queryRaw<{ id: string; name: string | null; email: string | null }[]>`
      SELECT p.id, p.name, u.email
      FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})`;
    return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
  }

  // ---- .xlsx exports ----

  async studentsXlsx(): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<
      { name: string | null; email: string | null; country: string | null; time_zone: string | null; status: string; created_at: Date; enrolled: number }[]
    >`
      SELECT p.name, u.email, p.country, p.time_zone, p.status, p.created_at,
             (SELECT count(*) FROM enrollments e WHERE e.user_id = p.id AND e.status <> 'cancelled')::int AS enrolled
      FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.role = 'learner'
      ORDER BY p.created_at DESC`;
    return buildXlsx(
      'Students',
      ['Name', 'Email', 'Country', 'Time zone', 'Status', 'Joined', 'Courses enrolled'],
      rows.map((r) => [r.name, r.email, r.country, r.time_zone, r.status, r.created_at, r.enrolled]),
    );
  }

  async enrollmentsXlsx(): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<
      { course: string; name: string | null; email: string | null; status: string; enrolled_at: Date }[]
    >`
      SELECT c.title AS course, p.name, u.email, e.status, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN profiles p ON p.id = e.user_id
      LEFT JOIN auth.users u ON u.id = e.user_id
      ORDER BY c.title, e.enrolled_at`;
    return buildXlsx(
      'Enrolments',
      ['Course', 'Student', 'Email', 'Enrolment status', 'Enrolled'],
      rows.map((r) => [r.course, r.name, r.email, r.status, r.enrolled_at]),
    );
  }

  async attendanceXlsx(courseId?: string): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<
      { course: string; class_title: string; starts_at: Date; name: string | null; email: string | null; first_joined_at: Date; total_seconds: number }[]
    >`
      SELECT c.title AS course, l.title AS class_title, l.starts_at, p.name, u.email, a.first_joined_at, a.total_seconds
      FROM live_class_attendance a
      JOIN live_classes l ON l.id = a.live_class_id
      JOIN courses c ON c.id = l.course_id
      LEFT JOIN profiles p ON p.id = a.user_id
      LEFT JOIN auth.users u ON u.id = a.user_id
      ${courseId ? Prisma.sql`WHERE l.course_id = ${courseId}::uuid` : Prisma.empty}
      ORDER BY l.starts_at DESC, p.name`;
    return buildXlsx(
      'Attendance',
      ['Course', 'Class', 'Class starts', 'Student', 'Email', 'First joined', 'Minutes in class'],
      rows.map((r) => [r.course, r.class_title, r.starts_at, r.name, r.email, r.first_joined_at, Math.round(r.total_seconds / 60)]),
    );
  }

  private async hostNames(ids: (string | null)[]): Promise<Map<string, string | null>> {
    const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
