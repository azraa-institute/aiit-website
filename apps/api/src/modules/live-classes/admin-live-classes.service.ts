import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AdminLiveClass, GenerateTimetableResponse, Timetable, TimetableConflict } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { joinOpensAt } from './live-class-state';
import { isValidTimeZone } from './tz.util';
import {
  DEFAULT_DAYS,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_START_TIME,
  DEFAULT_WEEKS,
  endDateForWeeks,
  overlaps,
  planSessions,
} from './timetable-plan';
import type {
  CreateLiveClassDto,
  GenerateTimetableDto,
  CreateTimetableDto,
  TimetableSlotDto,
  UpdateLiveClassDto,
  UpdateTimetableDto,
} from './dto/live-class.dto';

const MAX_RANGE_DAYS = 366;

const TIMETABLE_INCLUDE = {
  course: { select: { title: true } },
  slots: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
  _count: { select: { classes: true } },
} satisfies Prisma.TimetableInclude;

type TimetableRow = Prisma.TimetableGetPayload<{ include: typeof TIMETABLE_INCLUDE }>;

const ADMIN_CLASS_SELECT = {
  id: true,
  courseId: true,
  timetableId: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  status: true,
  hostUserId: true,
  joinOpensMinutes: true,
  course: { select: { slug: true, title: true } },
  _count: { select: { attendance: true } },
} satisfies Prisma.LiveClassSelect;

type AdminClassRow = Prisma.LiveClassGetPayload<{ select: typeof ADMIN_CLASS_SELECT }>;

/** Admin-only scheduling: timetables (weekly patterns) -> generated live classes, plus one-off classes. */
@Injectable()
export class AdminLiveClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---- Timetables ----

  async listTimetables(courseId?: string): Promise<Timetable[]> {
    const rows = await this.prisma.timetable.findMany({
      where: courseId ? { courseId } : {},
      include: TIMETABLE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toTimetable);
  }

  async createTimetable(adminId: string, dto: CreateTimetableDto): Promise<Timetable> {
    this.validateRange(dto.timeZone, dto.startsOn, dto.endsOn);
    this.validateSlots(dto.slots);
    await this.assertCourse(dto.courseId);
    await this.assertInstructor(dto.hostUserId);

    const row = await this.prisma.timetable.create({
      data: {
        courseId: dto.courseId,
        title: dto.title.trim(),
        timeZone: dto.timeZone,
        startsOn: new Date(`${dto.startsOn}T00:00:00Z`),
        endsOn: new Date(`${dto.endsOn}T00:00:00Z`),
        hostUserId: dto.hostUserId ?? null,
        createdBy: adminId,
        slots: { create: dto.slots.map(slotData) },
      },
      include: TIMETABLE_INCLUDE,
    });
    return toTimetable(row);
  }

  async updateTimetable(id: string, dto: UpdateTimetableDto): Promise<Timetable> {
    const existing = await this.prisma.timetable.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Timetable not found.');

    const timeZone = dto.timeZone ?? existing.timeZone;
    const startsOn = dto.startsOn ?? isoDate(existing.startsOn);
    const endsOn = dto.endsOn ?? isoDate(existing.endsOn);
    this.validateRange(timeZone, startsOn, endsOn);
    if (dto.slots) this.validateSlots(dto.slots);
    if (dto.hostUserId !== undefined) await this.assertInstructor(dto.hostUserId);

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.slots) {
        await tx.timetableSlot.deleteMany({ where: { timetableId: id } });
        await tx.timetableSlot.createMany({ data: dto.slots.map((s) => ({ ...slotData(s), timetableId: id })) });
      }
      // Re-assigning the default instructor also re-assigns the classes that
      // haven't happened yet, so admins don't have to edit each one by hand.
      if (dto.hostUserId !== undefined) {
        await tx.liveClass.updateMany({
          where: { timetableId: id, status: 'scheduled', startsAt: { gt: new Date() } },
          data: { hostUserId: dto.hostUserId ?? null },
        });
      }
      return tx.timetable.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          timeZone: dto.timeZone,
          startsOn: dto.startsOn ? new Date(`${dto.startsOn}T00:00:00Z`) : undefined,
          endsOn: dto.endsOn ? new Date(`${dto.endsOn}T00:00:00Z`) : undefined,
          hostUserId: dto.hostUserId,
        },
        include: TIMETABLE_INCLUDE,
      });
    });
    return toTimetable(row);
  }

  /** Removes the timetable and the classes it generated that haven't started; live/ended/cancelled history is kept (detached). */
  async deleteTimetable(id: string): Promise<void> {
    const existing = await this.prisma.timetable.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Timetable not found.');
    await this.prisma.$transaction([
      this.prisma.liveClass.deleteMany({ where: { timetableId: id, status: 'scheduled' } }),
      this.prisma.timetable.delete({ where: { id } }),
    ]);
  }

  /**
   * Turns the weekly pattern into dated classes. Idempotent: (timetable,
   * start time) is unique, so running it again only adds what is missing.
   * Slots already in the past are skipped.
   */
  async generateClasses(id: string): Promise<{ created: number; skipped: number }> {
    const timetable = await this.prisma.timetable.findUnique({
      where: { id },
      include: { slots: true, course: { select: { title: true } } },
    });
    if (!timetable) throw new NotFoundException('Timetable not found.');

    const now = Date.now();
    const planned = planSessions(isoDate(timetable.startsOn), isoDate(timetable.endsOn), timetable.slots, timetable.timeZone);
    const rows: Prisma.LiveClassCreateManyInput[] = planned
      .filter((p) => p.startsAt.getTime() > now)
      .map((p) => {
        const classId = randomUUID();
        return {
          id: classId,
          courseId: timetable.courseId,
          timetableId: timetable.id,
          title: timetable.title,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          hostUserId: timetable.hostUserId,
          roomName: `class-${classId}`,
        };
      });
    if (rows.length === 0) return { created: 0, skipped: 0 };
    const result = await this.prisma.liveClass.createMany({ data: rows, skipDuplicates: true });
    return { created: result.count, skipped: rows.length - result.count };
  }

  /**
   * The one-click path: an admin picks a course, a time zone and a start date;
   * everything else defaults (Mon/Wed/Fri, 18:00, 2 hours, 4 weeks -- the
   * standard one-month course) and the course's assigned instructor hosts.
   * Sessions that would double-book that instructor are reported back instead
   * of being created, unless the admin explicitly allows them.
   */
  async autoGenerate(adminId: string, dto: GenerateTimetableDto): Promise<GenerateTimetableResponse> {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const weeks = dto.weeks ?? DEFAULT_WEEKS;
    const startsOn = dto.startDate;
    const endsOn = endDateForWeeks(startsOn, weeks);
    this.validateRange(dto.timeZone, startsOn, endsOn);
    const days = [...new Set(dto.days ?? DEFAULT_DAYS)].sort();
    const startTime = dto.startTime ?? DEFAULT_START_TIME;
    const durationMinutes = dto.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const slots = days.map((weekday) => ({ weekday, startTime, durationMinutes }));

    const host = await this.pickInstructor(course.id, dto.hostUserId);
    const upcoming = planSessions(startsOn, endsOn, slots, dto.timeZone).filter((p) => p.startsAt.getTime() > Date.now());
    if (upcoming.length === 0) {
      throw new BadRequestException('Those dates are all in the past -- choose a start date in the future.');
    }
    const first = upcoming[0].startsAt;
    const last = upcoming[upcoming.length - 1].endsAt;

    const clash = await this.prisma.liveClass.count({
      where: { courseId: course.id, status: { in: ['scheduled', 'live'] }, startsAt: { lt: last }, endsAt: { gt: first } },
    });
    if (clash > 0) {
      throw new ConflictException(
        'This course already has classes scheduled in that period. Cancel or delete them first, or choose later dates.',
      );
    }

    if (host && !dto.allowConflicts) {
      const others = await this.prisma.liveClass.findMany({
        where: { hostUserId: host.id, status: { in: ['scheduled', 'live'] }, startsAt: { lt: last }, endsAt: { gt: first } },
        select: { title: true, startsAt: true, endsAt: true },
      });
      const conflicts: TimetableConflict[] = [];
      for (const p of upcoming) {
        const hit = others.find((o) => overlaps(p.startsAt, p.endsAt, o.startsAt, o.endsAt));
        if (hit) conflicts.push({ startsAt: p.startsAt.toISOString(), endsAt: p.endsAt.toISOString(), otherClass: hit.title });
      }
      if (conflicts.length > 0) return { status: 'conflicts', instructorName: host.name, conflicts };
    }

    const timetable = await this.createTimetable(adminId, {
      courseId: course.id,
      title: `${course.title} — live classes`,
      timeZone: dto.timeZone,
      startsOn,
      endsOn,
      hostUserId: host?.id ?? null,
      slots,
    });
    const { created } = await this.generateClasses(timetable.id);
    await this.audit.record(adminId, 'timetable.generate', 'timetable', timetable.id, {
      course: course.title,
      timeZone: dto.timeZone,
      created,
    });
    return { status: 'created', timetable, created, unassigned: !host, instructorName: host?.name ?? null };
  }

  /** An explicit choice wins; otherwise the assigned instructor with the lightest upcoming load. */
  private async pickInstructor(
    courseId: string,
    explicit?: string | null,
  ): Promise<{ id: string; name: string | null } | null> {
    if (explicit) {
      await this.assertInstructor(explicit);
      return this.prisma.profile.findUnique({ where: { id: explicit }, select: { id: true, name: true } });
    }
    const assigned = await this.prisma.courseInstructor.findMany({ where: { courseId }, select: { instructorId: true } });
    if (assigned.length === 0) return null;
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: assigned.map((a) => a.instructorId) }, role: 'instructor', status: 'active' },
      select: { id: true, name: true },
    });
    if (profiles.length === 0) return null;
    if (profiles.length === 1) return profiles[0];
    const load = await this.prisma.liveClass.groupBy({
      by: ['hostUserId'],
      where: { hostUserId: { in: profiles.map((p) => p.id) }, status: 'scheduled', startsAt: { gt: new Date() } },
      _count: { _all: true },
    });
    const counts = new Map(load.map((l) => [l.hostUserId, l._count._all]));
    return [...profiles].sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0))[0];
  }

  // ---- Classes ----

  async listClasses(courseId?: string): Promise<AdminLiveClass[]> {
    const rows = await this.prisma.liveClass.findMany({
      where: courseId ? { courseId } : {},
      select: ADMIN_CLASS_SELECT,
      orderBy: { startsAt: 'desc' },
      take: 300,
    });
    return this.toAdminClasses(rows);
  }

  async createClass(dto: CreateLiveClassDto): Promise<AdminLiveClass> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateWindow(startsAt, endsAt);
    await this.assertCourse(dto.courseId);
    await this.assertInstructor(dto.hostUserId);

    const id = randomUUID();
    const row = await this.prisma.liveClass.create({
      data: {
        id,
        roomName: `class-${id}`,
        courseId: dto.courseId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        startsAt,
        endsAt,
        hostUserId: dto.hostUserId ?? null,
        joinOpensMinutes: dto.joinOpensMinutes ?? 15,
      },
      select: ADMIN_CLASS_SELECT,
    });
    return (await this.toAdminClasses([row]))[0];
  }

  async updateClass(id: string, dto: UpdateLiveClassDto): Promise<AdminLiveClass> {
    const existing = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Class not found.');
    if (existing.status === 'live' || existing.status === 'ended') {
      throw new BadRequestException('A class that has started can no longer be edited.');
    }
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    this.validateWindow(startsAt, endsAt);
    if (dto.hostUserId !== undefined) await this.assertInstructor(dto.hostUserId);

    const row = await this.prisma.liveClass.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        hostUserId: dto.hostUserId,
        joinOpensMinutes: dto.joinOpensMinutes,
        status: dto.status,
      },
      select: ADMIN_CLASS_SELECT,
    });
    return (await this.toAdminClasses([row]))[0];
  }

  async attendance(id: string) {
    const cls = await this.prisma.liveClass.findUnique({ where: { id }, select: { id: true } });
    if (!cls) throw new NotFoundException('Class not found.');
    const rows = await this.prisma.liveClassAttendance.findMany({
      where: { liveClassId: id },
      orderBy: { firstJoinedAt: 'asc' },
    });
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    return rows.map((r) => ({
      userId: r.userId,
      name: names.get(r.userId) ?? null,
      firstJoinedAt: r.firstJoinedAt.toISOString(),
      lastLeftAt: r.lastLeftAt?.toISOString() ?? null,
      totalSeconds: r.totalSeconds,
    }));
  }

  // ---- validation helpers ----

  private validateRange(timeZone: string, startsOn: string, endsOn: string): void {
    if (!isValidTimeZone(timeZone)) throw new BadRequestException(`"${timeZone}" is not a valid time zone.`);
    const start = new Date(`${startsOn}T00:00:00Z`).getTime();
    const end = new Date(`${endsOn}T00:00:00Z`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) throw new BadRequestException('Invalid start or end date.');
    if (end < start) throw new BadRequestException('The end date must be on or after the start date.');
    if ((end - start) / 86_400_000 > MAX_RANGE_DAYS) {
      throw new BadRequestException(`A timetable can span at most ${MAX_RANGE_DAYS} days.`);
    }
  }

  private validateSlots(slots: TimetableSlotDto[]): void {
    const seen = new Set<string>();
    for (const s of slots) {
      const key = `${s.weekday}-${s.startTime}`;
      if (seen.has(key)) throw new BadRequestException('Two slots share the same day and start time.');
      seen.add(key);
    }
  }

  private validateWindow(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid start or end time.');
    }
    if (endsAt <= startsAt) throw new BadRequestException('A class must end after it starts.');
  }

  private async assertCourse(courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found.');
  }

  private async assertInstructor(userId: string | null | undefined): Promise<void> {
    if (!userId) return;
    const profile = await this.prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    if (profile?.role !== 'instructor') throw new BadRequestException('The selected host is not an instructor.');
  }

  private async toAdminClasses(rows: AdminClassRow[]): Promise<AdminLiveClass[]> {
    const ids = [...new Set(rows.map((r) => r.hostUserId).filter((v): v is string => Boolean(v)))];
    const profiles = ids.length
      ? await this.prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseSlug: r.course.slug,
      courseTitle: r.course.title,
      timetableId: r.timetableId,
      title: r.title,
      description: r.description,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      joinOpensAt: joinOpensAt(r).toISOString(),
      status: r.status,
      hostUserId: r.hostUserId,
      hostName: r.hostUserId ? (names.get(r.hostUserId) ?? null) : null,
      attendeeCount: r._count.attendance,
    }));
  }
}

function slotData(s: TimetableSlotDto) {
  return { weekday: s.weekday, startTime: s.startTime, durationMinutes: s.durationMinutes };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toTimetable(row: TimetableRow): Timetable {
  return {
    id: row.id,
    courseId: row.courseId,
    courseTitle: row.course.title,
    title: row.title,
    timeZone: row.timeZone,
    startsOn: isoDate(row.startsOn),
    endsOn: isoDate(row.endsOn),
    hostUserId: row.hostUserId,
    slots: row.slots.map((s) => ({
      id: s.id,
      weekday: s.weekday,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
    })),
    classCount: row._count.classes,
  };
}
