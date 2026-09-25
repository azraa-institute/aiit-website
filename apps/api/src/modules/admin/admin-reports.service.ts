import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AttendanceReportRow } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toCsv } from '../../common/csv';

/** Attendance figures and CSV exports for the admin portal. */
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

  // ---- CSV exports ----

  async studentsCsv(): Promise<string> {
    const rows = await this.prisma.$queryRaw<
      { name: string | null; email: string | null; country: string | null; time_zone: string | null; status: string; created_at: Date; enrolled: number }[]
    >`
      SELECT p.name, u.email, p.country, p.time_zone, p.status, p.created_at,
             (SELECT count(*) FROM enrollments e WHERE e.user_id = p.id AND e.status <> 'cancelled')::int AS enrolled
      FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.role = 'learner'
      ORDER BY p.created_at DESC`;
    return toCsv(
      ['Name', 'Email', 'Country', 'Time zone', 'Status', 'Joined', 'Courses enrolled'],
      rows.map((r) => [r.name, r.email, r.country, r.time_zone, r.status, r.created_at, r.enrolled]),
    );
  }

  async enrollmentsCsv(): Promise<string> {
    const rows = await this.prisma.$queryRaw<
      { course: string; name: string | null; email: string | null; status: string; enrolled_at: Date }[]
    >`
      SELECT c.title AS course, p.name, u.email, e.status, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN profiles p ON p.id = e.user_id
      LEFT JOIN auth.users u ON u.id = e.user_id
      ORDER BY c.title, e.enrolled_at`;
    return toCsv(
      ['Course', 'Student', 'Email', 'Enrolment status', 'Enrolled'],
      rows.map((r) => [r.course, r.name, r.email, r.status, r.enrolled_at]),
    );
  }

  async attendanceCsv(courseId?: string): Promise<string> {
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
    return toCsv(
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
