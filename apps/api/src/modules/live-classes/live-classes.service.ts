import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { LiveClassJoin, LiveClassRole, LiveClassSummary } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/guards/jwt.guard';
import { computeJoinState, joinOpensAt } from './live-class-state';
import { LiveKitService } from './livekit.service';

export const CLASS_SELECT = {
  id: true,
  courseId: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  status: true,
  hostUserId: true,
  joinOpensMinutes: true,
  roomName: true,
  course: { select: { slug: true, title: true } },
} satisfies Prisma.LiveClassSelect;

export type ClassRow = Prisma.LiveClassGetPayload<{ select: typeof CLASS_SELECT }>;

/** How far back / forward the "my classes" list looks. */
const LIST_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const LIST_LOOKAHEAD_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class LiveClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekit: LiveKitService,
  ) {}

  /** Admins moderate any class; an instructor only the classes they host; everyone else is a learner. */
  roleFor(user: AuthenticatedUser, cls: Pick<ClassRow, 'hostUserId'>): LiveClassRole {
    if (user.role === 'admin') return 'host';
    if (user.role === 'instructor' && cls.hostUserId === user.userId) return 'host';
    return 'learner';
  }

  async listForUser(user: AuthenticatedUser): Promise<LiveClassSummary[]> {
    const now = Date.now();
    const window = { gte: new Date(now - LIST_LOOKBACK_MS), lte: new Date(now + LIST_LOOKAHEAD_MS) };
    let where: Prisma.LiveClassWhereInput;
    if (user.role === 'admin') {
      where = { endsAt: window };
    } else if (user.role === 'instructor') {
      where = { hostUserId: user.userId, endsAt: window };
    } else {
      const enrolled = await this.prisma.enrollment.findMany({
        where: { userId: user.userId, status: { not: 'cancelled' } },
        select: { courseId: true },
      });
      where = { courseId: { in: enrolled.map((e) => e.courseId) }, endsAt: window };
    }
    const rows = await this.prisma.liveClass.findMany({
      where,
      select: CLASS_SELECT,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    const hostNames = await this.hostNames(rows);
    return rows.map((r) => this.toSummary(r, this.roleFor(user, r), hostNames));
  }

  /**
   * The security gate: nobody gets a LiveKit token without passing every check
   * here, and the room name is never accepted from the client -- it is looked
   * up from the class the caller is authorised for.
   */
  async join(user: AuthenticatedUser, id: string): Promise<LiveClassJoin> {
    const cls = await this.getClass(id);
    const role = this.roleFor(user, cls);

    if (role === 'learner') {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.userId, courseId: cls.courseId } },
        select: { status: true },
      });
      if (!enrollment || enrollment.status === 'cancelled') {
        throw new ForbiddenException('You are not enrolled in this course.');
      }
    }

    const state = computeJoinState(cls, role);
    if (state === 'cancelled') throw new ConflictException('This class has been cancelled.');
    if (state === 'ended') throw new ConflictException('This class has ended.');
    if (state === 'not_open') {
      throw new ForbiddenException(`This class opens at ${joinOpensAt(cls).toISOString()}.`);
    }
    if (state === 'waiting_for_host') {
      throw new ConflictException('The instructor has not started this class yet.');
    }

    if (role === 'host' && cls.status === 'scheduled') {
      // Conditional so two simultaneous "Start class" clicks can't both flip it.
      await this.prisma.liveClass.updateMany({
        where: { id: cls.id, status: 'scheduled' },
        data: { status: 'live', startedAt: new Date() },
      });
      cls.status = 'live';
    }

    if (role === 'learner') {
      await this.prisma.liveClassAttendance.upsert({
        where: { liveClassId_userId: { liveClassId: cls.id, userId: user.userId } },
        create: { liveClassId: cls.id, userId: user.userId, firstJoinedAt: new Date() },
        update: {},
      });
    }

    const displayName = await this.displayName(user);
    const token = this.livekit.createJoinToken({
      identity: user.userId,
      name: displayName,
      room: cls.roomName,
      host: role === 'host',
      metadata: JSON.stringify({ role }),
    });
    const hostNames = await this.hostNames([cls]);
    return {
      token,
      url: this.livekit.wsUrl,
      role,
      identity: user.userId,
      displayName,
      liveClass: this.toSummary(cls, role, hostNames),
    };
  }

  async end(user: AuthenticatedUser, id: string): Promise<LiveClassSummary> {
    const cls = await this.getClass(id);
    const role = this.roleFor(user, cls);
    if (role !== 'host') throw new ForbiddenException('Only the instructor can end this class.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');

    await this.prisma.liveClass.update({ where: { id }, data: { status: 'ended', endedAt: new Date() } });
    cls.status = 'ended';
    // Best effort: the class is already marked ended in our own records even if LiveKit is unreachable.
    await this.livekit.deleteRoom(cls.roomName).catch(() => undefined);
    return this.toSummary(cls, role, await this.hostNames([cls]));
  }

  async moderate(user: AuthenticatedUser, id: string, identity: string, action: 'mute' | 'remove'): Promise<void> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can do that.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    if (identity === user.userId) throw new ConflictException('You cannot do that to yourself.');

    const target = await this.prisma.profile.findUnique({ where: { id: identity }, select: { role: true } });
    if (target?.role === 'admin' && user.role !== 'admin') {
      throw new ForbiddenException('You cannot moderate an administrator.');
    }
    if (action === 'mute') await this.livekit.muteParticipant(cls.roomName, identity);
    else await this.livekit.removeParticipant(cls.roomName, identity);
  }

  // ---- LiveKit webhook -> attendance ----

  async recordParticipantEvent(
    event: 'participant_joined' | 'participant_left',
    roomName: string,
    identity: string,
    at: Date,
  ): Promise<void> {
    const cls = await this.prisma.liveClass.findUnique({ where: { roomName }, select: { id: true, hostUserId: true } });
    if (!cls || cls.hostUserId === identity) return;
    const profile = await this.prisma.profile.findUnique({ where: { id: identity }, select: { role: true } });
    // Only learners are tracked; the instructor and any admin observer aren't attendees.
    if (!profile || profile.role !== 'learner') return;

    const where = { liveClassId_userId: { liveClassId: cls.id, userId: identity } };
    if (event === 'participant_joined') {
      await this.prisma.liveClassAttendance.upsert({
        where,
        create: { liveClassId: cls.id, userId: identity, firstJoinedAt: at, lastJoinedAt: at },
        update: { lastJoinedAt: at },
      });
      return;
    }
    const row = await this.prisma.liveClassAttendance.findUnique({ where });
    if (!row?.lastJoinedAt) return;
    const seconds = Math.max(0, Math.round((at.getTime() - row.lastJoinedAt.getTime()) / 1000));
    await this.prisma.liveClassAttendance.update({
      where,
      data: { totalSeconds: { increment: seconds }, lastLeftAt: at, lastJoinedAt: null },
    });
  }

  // ---- helpers ----

  private async getClass(id: string): Promise<ClassRow> {
    const cls = await this.prisma.liveClass.findUnique({ where: { id }, select: CLASS_SELECT });
    if (!cls) throw new NotFoundException('Class not found.');
    return cls;
  }

  private async displayName(user: AuthenticatedUser): Promise<string> {
    const profile = await this.prisma.profile.findUnique({ where: { id: user.userId }, select: { name: true } });
    return profile?.name?.trim() || user.email?.split('@')[0] || 'Participant';
  }

  async hostNames(rows: Pick<ClassRow, 'hostUserId'>[]): Promise<Map<string, string | null>> {
    const ids = [...new Set(rows.map((r) => r.hostUserId).filter((v): v is string => Boolean(v)))];
    if (ids.length === 0) return new Map();
    const profiles = await this.prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(profiles.map((p) => [p.id, p.name]));
  }

  toSummary(row: ClassRow, role: LiveClassRole, hostNames: Map<string, string | null>): LiveClassSummary {
    return {
      id: row.id,
      courseId: row.courseId,
      courseSlug: row.course.slug,
      courseTitle: row.course.title,
      title: row.title,
      description: row.description,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      joinOpensAt: joinOpensAt(row).toISOString(),
      status: row.status,
      hostName: row.hostUserId ? (hostNames.get(row.hostUserId) ?? null) : null,
      role,
      joinState: computeJoinState(row, role),
    };
  }
}
