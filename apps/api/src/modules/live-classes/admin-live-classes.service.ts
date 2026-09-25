import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AdminLiveClass, InstructorOption, Timetable } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { joinOpensAt } from './live-class-state';
import { isValidTimeZone, zonedTimeToUtc } from './tz.util';
import type {
  CreateLiveClassDto,
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
  constructor(private readonly prisma: PrismaService) {}

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
    const rows: Prisma.LiveClassCreateManyInput[] = [];
    const end = timetable.endsOn.getTime();
    for (let t = timetable.startsOn.getTime(); t <= end; t += 24 * 60 * 60 * 1000) {
      const day = new Date(t);
      const weekday = day.getUTCDay();
      for (const slot of timetable.slots.filter((s) => s.weekday === weekday)) {
        const [hh, mm] = slot.startTime.split(':').map(Number);
        const startsAt = zonedTimeToUtc(
          day.getUTCFullYear(),
          day.getUTCMonth() + 1,
          day.getUTCDate(),
          hh,
          mm,
          timetable.timeZone,
        );
        if (startsAt.getTime() <= now) continue;
        const classId = randomUUID();
        rows.push({
          id: classId,
          courseId: timetable.courseId,
          timetableId: timetable.id,
          title: timetable.title,
          startsAt,
          endsAt: new Date(startsAt.getTime() + slot.durationMinutes * 60_000),
          hostUserId: timetable.hostUserId,
          roomName: `class-${classId}`,
        });
      }
    }
    if (rows.length === 0) return { created: 0, skipped: 0 };
    const result = await this.prisma.liveClass.createMany({ data: rows, skipDuplicates: true });
    return { created: result.count, skipped: rows.length - result.count };
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

  async listInstructors(): Promise<InstructorOption[]> {
    try {
      const rows = await this.prisma.$queryRaw<{ id: string; name: string | null; email: string | null }[]>`
        SELECT p.id, p.name, u.email
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.role = 'instructor' AND p.status = 'active'
        ORDER BY p.name NULLS LAST
      `;
      return rows;
    } catch {
      // auth.users unreadable -> still list them, just without emails.
      const rows = await this.prisma.profile.findMany({
        where: { role: 'instructor', status: 'active' },
        select: { id: true, name: true },
      });
      return rows.map((r) => ({ ...r, email: null }));
    }
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
