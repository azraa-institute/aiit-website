import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BreakoutJoin,
  LiveClassBreakouts,
  LiveClassJoin,
  LiveClassPoll,
  LiveClassRole,
  LiveClassSummary,
  LiveClassWhiteboard,
  PinnedResource,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/guards/jwt.guard';
import { computeJoinState, joinOpensAt } from './live-class-state';
import { LiveKitService } from './livekit.service';
import type { CreatePollDto, PinResourceDto } from './dto/live-class.dto';

/** The full stored shape, including raw votes -- never sent to a client as-is, see toPollView(). */
interface RawPoll {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  votes: Record<string, string>;
  status: 'open' | 'closed';
  createdAt: string;
  closedAt: string | null;
}

interface RawBreakouts {
  rooms: { id: string; name: string }[];
  /** learnerId -> roomId. The host is never a key here -- see joinBreakout/toBreakoutsView. */
  assignments: Record<string, string>;
  startedAt: string;
}

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

/** Generous for a few hundred strokes plus one capped-size embedded background image; rejects anything wildly oversized rather than validating exact shape, which is the client's concern. */
const MAX_WHITEBOARD_JSON_LENGTH = 2_000_000;

const MAX_PINNED_RESOURCES = 20;

const MIN_BREAKOUT_ROOMS = 2;
const MAX_BREAKOUT_ROOMS = 10;

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
    const role = await this.assertEnrolledOrHost(user, cls);

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

  /**
   * 'mute' mutes the participant's current audio track AND revokes their
   * permission to publish a new one, so it actually sticks -- they cannot
   * unmute themselves until the instructor calls 'unmute', which only
   * restores that permission (it doesn't itself turn their mic back on).
   */
  async moderate(user: AuthenticatedUser, id: string, identity: string, action: 'mute' | 'unmute' | 'remove'): Promise<void> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can do that.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    if (identity === user.userId) throw new ConflictException('You cannot do that to yourself.');

    const target = await this.prisma.profile.findUnique({ where: { id: identity }, select: { role: true } });
    if (target?.role === 'admin' && user.role !== 'admin') {
      throw new ForbiddenException('You cannot moderate an administrator.');
    }
    if (action === 'mute') {
      await this.livekit.muteParticipant(cls.roomName, identity);
      await this.livekit.setMicrophonePublishAllowed(cls.roomName, identity, false);
    } else if (action === 'unmute') {
      await this.livekit.setMicrophonePublishAllowed(cls.roomName, identity, true);
    } else {
      await this.livekit.removeParticipant(cls.roomName, identity);
    }
  }

  /** Anyone who could join this class can read its board, including after the class has ended (for review). */
  async getWhiteboard(user: AuthenticatedUser, id: string): Promise<LiveClassWhiteboard> {
    const cls = await this.getClass(id);
    await this.assertEnrolledOrHost(user, cls);
    const row = await this.prisma.liveClass.findUnique({ where: { id }, select: { whiteboardState: true } });
    return { state: row?.whiteboardState ?? null };
  }

  /**
   * Same trust level as chat -- any current participant may save, not just
   * the host, since the host can grant the pen to a learner client-side and
   * whoever is holding it is the one with fresh state to persist.
   */
  async saveWhiteboard(user: AuthenticatedUser, id: string, state: Record<string, unknown>): Promise<void> {
    const cls = await this.getClass(id);
    await this.assertEnrolledOrHost(user, cls);
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    if (JSON.stringify(state).length > MAX_WHITEBOARD_JSON_LENGTH) {
      throw new BadRequestException('That whiteboard is too large to save.');
    }
    await this.prisma.liveClass.update({ where: { id }, data: { whiteboardState: state as Prisma.InputJsonValue } });
  }

  /** Readable after the class ends too, so pinned links survive into the course workspace for review. */
  async listResources(user: AuthenticatedUser, id: string): Promise<PinnedResource[]> {
    const cls = await this.getClass(id);
    await this.assertEnrolledOrHost(user, cls);
    return this.currentResources(id);
  }

  async pinResource(user: AuthenticatedUser, id: string, dto: PinResourceDto): Promise<PinnedResource[]> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can pin a resource.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    const current = await this.currentResources(id);
    if (current.length >= MAX_PINNED_RESOURCES) throw new BadRequestException('Unpin something before adding another.');
    const next: PinnedResource[] = [
      ...current,
      { id: randomUUID(), title: dto.title.trim(), url: dto.url.trim(), note: dto.note?.trim() || null, pinnedAt: new Date().toISOString() },
    ];
    await this.prisma.liveClass.update({ where: { id }, data: { pinnedResources: next as unknown as Prisma.InputJsonValue } });
    return next;
  }

  async unpinResource(user: AuthenticatedUser, id: string, resourceId: string): Promise<PinnedResource[]> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can unpin a resource.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    const next = (await this.currentResources(id)).filter((r) => r.id !== resourceId);
    await this.prisma.liveClass.update({ where: { id }, data: { pinnedResources: next as unknown as Prisma.InputJsonValue } });
    return next;
  }

  private async currentResources(id: string): Promise<PinnedResource[]> {
    const row = await this.prisma.liveClass.findUnique({ where: { id }, select: { pinnedResources: true } });
    const value = row?.pinnedResources;
    return Array.isArray(value) ? (value as unknown as PinnedResource[]) : [];
  }

  /** Null when no poll has been run yet, or the current one still needs the client to know their own role's view of it. */
  async getPoll(user: AuthenticatedUser, id: string): Promise<LiveClassPoll | null> {
    const cls = await this.getClass(id);
    const role = await this.assertEnrolledOrHost(user, cls);
    const poll = await this.currentPoll(id);
    return poll ? this.toPollView(poll, role === 'host', user.userId) : null;
  }

  /** Starting a new poll replaces the current one -- there is no poll history, only "the current one". */
  async createPoll(user: AuthenticatedUser, id: string, dto: CreatePollDto): Promise<LiveClassPoll> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can start a poll.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    const poll: RawPoll = {
      id: randomUUID(),
      question: dto.question.trim(),
      options: dto.options.map((text) => ({ id: randomUUID(), text: text.trim() })),
      votes: {},
      status: 'open',
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
    await this.savePoll(id, poll);
    return this.toPollView(poll, true, user.userId);
  }

  /** Votes are keyed by user id, so a second vote replaces the caller's first rather than adding another. */
  async votePoll(user: AuthenticatedUser, id: string, optionId: string): Promise<LiveClassPoll> {
    const cls = await this.getClass(id);
    const role = await this.assertEnrolledOrHost(user, cls);
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    const poll = await this.currentPoll(id);
    if (!poll) throw new NotFoundException('There is no active poll.');
    if (poll.status !== 'open') throw new ConflictException('This poll is closed.');
    if (!poll.options.some((o) => o.id === optionId)) throw new BadRequestException('That is not one of the poll options.');
    poll.votes[user.userId] = optionId;
    await this.savePoll(id, poll);
    return this.toPollView(poll, role === 'host', user.userId);
  }

  /** Closing reveals results to everyone, not just the host. */
  async closePoll(user: AuthenticatedUser, id: string): Promise<LiveClassPoll> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can close the poll.');
    const poll = await this.currentPoll(id);
    if (!poll) throw new NotFoundException('There is no active poll.');
    poll.status = 'closed';
    poll.closedAt = new Date().toISOString();
    await this.savePoll(id, poll);
    return this.toPollView(poll, true, user.userId);
  }

  private async currentPoll(id: string): Promise<RawPoll | null> {
    const row = await this.prisma.liveClass.findUnique({ where: { id }, select: { activePoll: true } });
    const value = row?.activePoll;
    return value && typeof value === 'object' ? (value as unknown as RawPoll) : null;
  }

  private async savePoll(id: string, poll: RawPoll): Promise<void> {
    await this.prisma.liveClass.update({ where: { id }, data: { activePoll: poll as unknown as Prisma.InputJsonValue } });
  }

  /** Raw votes never leave this function -- only a per-option tally, and only the caller's own vote. */
  private toPollView(poll: RawPoll, showResults: boolean, userId: string): LiveClassPoll {
    const reveal = showResults || poll.status === 'closed';
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      status: poll.status,
      createdAt: poll.createdAt,
      closedAt: poll.closedAt,
      results: reveal ? this.tally(poll) : null,
      myVote: poll.votes[userId] ?? null,
    };
  }

  private tally(poll: RawPoll): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const o of poll.options) counts[o.id] = 0;
    for (const optionId of Object.values(poll.votes)) {
      if (counts[optionId] !== undefined) counts[optionId] += 1;
    }
    return counts;
  }

  /**
   * Auto-splits whoever is actually connected to the main room right now
   * (not the full roster -- someone enrolled but not in class today
   * shouldn't get a room). Starting again replaces the previous rooms and
   * assignments outright; the caller should close first if they want a
   * clean slate rather than a reshuffle.
   */
  async startBreakouts(user: AuthenticatedUser, id: string, roomCount: number): Promise<LiveClassBreakouts> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can start breakout rooms.');
    if (cls.status !== 'live') throw new ConflictException('This class is not live.');
    if (roomCount < MIN_BREAKOUT_ROOMS || roomCount > MAX_BREAKOUT_ROOMS) {
      throw new BadRequestException(`Choose between ${MIN_BREAKOUT_ROOMS} and ${MAX_BREAKOUT_ROOMS} rooms.`);
    }

    const connected = await this.livekit.listParticipants(cls.roomName);
    const learnerIds = connected.filter((identity) => identity !== cls.hostUserId);

    const rooms = Array.from({ length: roomCount }, (_, i) => ({ id: randomUUID(), name: `Room ${i + 1}` }));
    const assignments: Record<string, string> = {};
    learnerIds.forEach((identity, i) => {
      assignments[identity] = rooms[i % rooms.length].id;
    });

    const state: RawBreakouts = { rooms, assignments, startedAt: new Date().toISOString() };
    await this.saveBreakouts(id, state);
    return this.toBreakoutsView(state, user.userId);
  }

  /** Null when breakout rooms are not active. */
  async getBreakouts(user: AuthenticatedUser, id: string): Promise<LiveClassBreakouts | null> {
    const cls = await this.getClass(id);
    await this.assertEnrolledOrHost(user, cls);
    const state = await this.currentBreakouts(id);
    return state ? this.toBreakoutsView(state, user.userId) : null;
  }

  /** roomId omitted moves the student back to the main room (no longer assigned anywhere). */
  async moveBreakout(user: AuthenticatedUser, id: string, studentId: string, roomId: string | null): Promise<LiveClassBreakouts> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can move a student.');
    const state = await this.currentBreakouts(id);
    if (!state) throw new NotFoundException('Breakout rooms are not active.');
    if (roomId === null) {
      delete state.assignments[studentId];
    } else {
      if (!state.rooms.some((r) => r.id === roomId)) throw new BadRequestException('That room does not exist.');
      state.assignments[studentId] = roomId;
    }
    await this.saveBreakouts(id, state);
    return this.toBreakoutsView(state, user.userId);
  }

  /** Best-effort: closes each breakout's LiveKit room (disconnecting anyone still in it) and clears the assignment record. */
  async closeBreakouts(user: AuthenticatedUser, id: string): Promise<void> {
    const cls = await this.getClass(id);
    if (this.roleFor(user, cls) !== 'host') throw new ForbiddenException('Only the instructor can close breakout rooms.');
    const state = await this.currentBreakouts(id);
    if (state) {
      await Promise.all(state.rooms.map((r) => this.livekit.deleteRoom(this.breakoutRoomName(cls.roomName, r.id)).catch(() => undefined)));
    }
    await this.prisma.liveClass.update({ where: { id }, data: { breakoutState: Prisma.JsonNull } });
  }

  /** The host may visit any room; a learner only the one they're assigned to. */
  async joinBreakout(user: AuthenticatedUser, id: string, roomId: string): Promise<BreakoutJoin> {
    const cls = await this.getClass(id);
    const role = this.roleFor(user, cls);
    const state = await this.currentBreakouts(id);
    if (!state) throw new NotFoundException('Breakout rooms are not active.');
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) throw new NotFoundException('That breakout room does not exist.');
    if (role !== 'host' && state.assignments[user.userId] !== roomId) {
      throw new ForbiddenException('You are not assigned to that room.');
    }
    const displayName = await this.displayName(user);
    const roomName = this.breakoutRoomName(cls.roomName, room.id);
    const token = this.livekit.createJoinToken({
      identity: user.userId,
      name: displayName,
      room: roomName,
      host: role === 'host',
      metadata: JSON.stringify({ role }),
    });
    return { token, url: this.livekit.wsUrl, roomId: room.id, roomName: room.name };
  }

  private breakoutRoomName(mainRoomName: string, roomId: string): string {
    return `${mainRoomName}-bo-${roomId}`;
  }

  private async currentBreakouts(id: string): Promise<RawBreakouts | null> {
    const row = await this.prisma.liveClass.findUnique({ where: { id }, select: { breakoutState: true } });
    const value = row?.breakoutState;
    return value && typeof value === 'object' ? (value as unknown as RawBreakouts) : null;
  }

  private async saveBreakouts(id: string, state: RawBreakouts): Promise<void> {
    await this.prisma.liveClass.update({ where: { id }, data: { breakoutState: state as unknown as Prisma.InputJsonValue } });
  }

  private async toBreakoutsView(state: RawBreakouts, callerId: string): Promise<LiveClassBreakouts> {
    const memberIds = Object.keys(state.assignments);
    const names = await this.names(memberIds);
    const byRoom = new Map<string, { id: string; name: string | null }[]>();
    for (const [learnerId, roomId] of Object.entries(state.assignments)) {
      const list = byRoom.get(roomId) ?? [];
      list.push({ id: learnerId, name: names.get(learnerId) ?? null });
      byRoom.set(roomId, list);
    }
    return {
      rooms: state.rooms.map((r) => ({ id: r.id, name: r.name, members: byRoom.get(r.id) ?? [] })),
      myRoomId: state.assignments[callerId] ?? null,
      startedAt: state.startedAt,
    };
  }

  private async names(ids: string[]): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.profile.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
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

  /** The enrolled-or-host gate shared by join() and the whiteboard endpoints. */
  private async assertEnrolledOrHost(user: AuthenticatedUser, cls: Pick<ClassRow, 'hostUserId' | 'courseId'>): Promise<LiveClassRole> {
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
    return role;
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
