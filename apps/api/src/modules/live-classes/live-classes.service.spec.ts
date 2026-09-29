import { createHash } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser } from '../../common/guards/jwt.guard';
import { LiveClassesService } from './live-classes.service';
import { LiveKitService } from './livekit.service';

const HOUR = 3_600_000;
const HOST_ID = '11111111-1111-4111-8111-111111111111';
const LEARNER_ID = '22222222-2222-4222-8222-222222222222';

function classRow(overrides: Record<string, unknown> = {}) {
  const startsAt = new Date(Date.now() - 5 * 60_000); // started 5 min ago -> join window open
  return {
    id: 'cls-1',
    courseId: 'crs-1',
    title: 'Cloud Computing - live class',
    description: null,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: 'live',
    hostUserId: HOST_ID,
    joinOpensMinutes: 15,
    roomName: 'class-cls-1',
    course: { slug: 'cloud-computing-fundamentals', title: 'Cloud Computing Fundamentals' },
    ...overrides,
  };
}

const learner: AuthenticatedUser = { userId: LEARNER_ID, role: 'learner', email: 'ada@example.com' };
const instructor: AuthenticatedUser = { userId: HOST_ID, role: 'instructor', email: 'host@example.com' };
const otherInstructor: AuthenticatedUser = { userId: '33333333-3333-4333-8333-333333333333', role: 'instructor' };
const admin: AuthenticatedUser = { userId: '44444444-4444-4444-8444-444444444444', role: 'admin' };

describe('LiveClassesService', () => {
  let service: LiveClassesService;
  let prisma: {
    liveClass: { findUnique: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
    liveClassAttendance: { upsert: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    enrollment: { findUnique: jest.Mock; findMany: jest.Mock };
    profile: { findUnique: jest.Mock; findMany: jest.Mock };
  };
  let livekit: LiveKitService;

  beforeEach(() => {
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
    process.env.LIVEKIT_API_KEY = 'APItestkey';
    process.env.LIVEKIT_API_SECRET = 'test-secret-value-that-is-long-enough';
    prisma = {
      liveClass: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      liveClassAttendance: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      enrollment: { findUnique: jest.fn(), findMany: jest.fn() },
      profile: { findUnique: jest.fn().mockResolvedValue({ name: 'Ada' }), findMany: jest.fn().mockResolvedValue([]) },
    };
    livekit = new LiveKitService();
    service = new LiveClassesService(prisma as never, livekit);
  });

  afterEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  describe('join', () => {
    it('404s for an unknown class', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(null);
      await expect(service.join(learner, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a learner who is not enrolled in the class course', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a learner whose enrollment was cancelled', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'cancelled' });
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('makes an enrolled learner wait until the instructor has started the class', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'scheduled' }));
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to join before the window opens', async () => {
      const startsAt = new Date(Date.now() + 3 * HOUR);
      prisma.liveClass.findUnique.mockResolvedValue(
        classRow({ status: 'scheduled', startsAt, endsAt: new Date(startsAt.getTime() + HOUR) }),
      );
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses cancelled and ended classes', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'cancelled' }));
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ConflictException);
      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'ended' }));
      await expect(service.join(learner, 'cls-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('gives an enrolled learner a subscribe/publish token limited to camera + microphone, and records attendance', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });

      const res = await service.join(learner, 'cls-1');

      expect(res.role).toBe('learner');
      expect(res.url).toBe('wss://example.livekit.cloud');
      const claims = jwt.verify(res.token, process.env.LIVEKIT_API_SECRET as string) as {
        iss: string;
        sub: string;
        video: Record<string, unknown>;
      };
      expect(claims.iss).toBe('APItestkey');
      expect(claims.sub).toBe(LEARNER_ID);
      expect(claims.video).toMatchObject({ room: 'class-cls-1', roomJoin: true, canSubscribe: true });
      expect(claims.video.roomAdmin).toBeUndefined();
      expect(claims.video.canPublishSources).toEqual(['camera', 'microphone']);
      expect(prisma.liveClassAttendance.upsert).toHaveBeenCalledTimes(1);
      // The secret must never appear in what the browser receives.
      expect(JSON.stringify(res)).not.toContain(process.env.LIVEKIT_API_SECRET as string);
    });

    it("lets the class's own instructor start a scheduled class, with room-admin rights", async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'scheduled' }));

      const res = await service.join(instructor, 'cls-1');

      expect(res.role).toBe('host');
      expect(prisma.liveClass.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cls-1', status: 'scheduled' } }),
      );
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
      const claims = jwt.verify(res.token, process.env.LIVEKIT_API_SECRET as string) as { video: { roomAdmin?: boolean } };
      expect(claims.video.roomAdmin).toBe(true);
    });

    it("treats an instructor who does not host this class as a learner (needs enrollment)", async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.join(otherInstructor, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin in as host without enrollment', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      const res = await service.join(admin, 'cls-1');
      expect(res.role).toBe('host');
    });
  });

  describe('end / moderation', () => {
    it('only the host can end a class', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.end(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.end(otherInstructor, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks the class ended and closes the room (best effort)', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      const deleteRoom = jest.spyOn(livekit, 'deleteRoom').mockRejectedValue(new Error('livekit down'));

      const res = await service.end(instructor, 'cls-1');

      expect(res.status).toBe('ended');
      expect(prisma.liveClass.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ended' }) }),
      );
      expect(deleteRoom).toHaveBeenCalledWith('class-cls-1');
    });

    it('lets a learner not moderate, and stops an instructor moderating an admin', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.moderate(learner, 'cls-1', HOST_ID, 'remove')).rejects.toBeInstanceOf(ForbiddenException);

      prisma.profile.findUnique.mockResolvedValue({ role: 'admin' });
      await expect(service.moderate(instructor, 'cls-1', admin.userId, 'remove')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("'mute' both mutes the current track and revokes the mic-publish permission, so it actually sticks", async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      const mute = jest.spyOn(livekit, 'muteParticipant').mockResolvedValue(undefined);
      const setAllowed = jest.spyOn(livekit, 'setMicrophonePublishAllowed').mockResolvedValue(undefined);

      await service.moderate(instructor, 'cls-1', LEARNER_ID, 'mute');

      expect(mute).toHaveBeenCalledWith('class-cls-1', LEARNER_ID);
      expect(setAllowed).toHaveBeenCalledWith('class-cls-1', LEARNER_ID, false);
    });

    it("'unmute' only restores permission -- it doesn't itself mute/unmute a track", async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      const mute = jest.spyOn(livekit, 'muteParticipant').mockResolvedValue(undefined);
      const setAllowed = jest.spyOn(livekit, 'setMicrophonePublishAllowed').mockResolvedValue(undefined);

      await service.moderate(instructor, 'cls-1', LEARNER_ID, 'unmute');

      expect(mute).not.toHaveBeenCalled();
      expect(setAllowed).toHaveBeenCalledWith('class-cls-1', LEARNER_ID, true);
    });
  });

  describe('whiteboard', () => {
    it('lets an enrolled learner read the board, including after the class has ended', async () => {
      prisma.liveClass.findUnique
        .mockResolvedValueOnce(classRow({ status: 'ended' }))
        .mockResolvedValueOnce({ whiteboardState: { strokes: [1] } });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });

      const res = await service.getWhiteboard(learner, 'cls-1');

      expect(res).toEqual({ state: { strokes: [1] } });
    });

    it('returns a null state when nothing has been saved yet', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ whiteboardState: null });
      const res = await service.getWhiteboard(instructor, 'cls-1');
      expect(res).toEqual({ state: null });
    });

    it('refuses a learner who is not enrolled', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.getWhiteboard(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets any current participant save, not just the host', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });

      await service.saveWhiteboard(learner, 'cls-1', { strokes: [] });

      expect(prisma.liveClass.update).toHaveBeenCalledWith({
        where: { id: 'cls-1' },
        data: { whiteboardState: { strokes: [] } },
      });
    });

    it('refuses to save once the class is no longer live', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'ended' }));
      await expect(service.saveWhiteboard(instructor, 'cls-1', {})).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an oversized board', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.saveWhiteboard(instructor, 'cls-1', { big: 'x'.repeat(2_100_000) })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.liveClass.update).not.toHaveBeenCalled();
    });
  });

  describe('pinned resources', () => {
    it('lets an enrolled learner read the pinned resources, defaulting to none saved yet', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ pinnedResources: null });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      const res = await service.listResources(learner, 'cls-1');
      expect(res).toEqual([]);
    });

    it('only the host can pin, and only while the class is live', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(
        service.pinResource(learner, 'cls-1', { title: 'Slides', url: 'https://example.com/slides' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'ended' }));
      await expect(
        service.pinResource(instructor, 'cls-1', { title: 'Slides', url: 'https://example.com/slides' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('appends a resource with a generated id and timestamp, keeping any already pinned', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        pinnedResources: [{ id: 'r1', title: 'Repo', url: 'https://example.com/repo', note: null, pinnedAt: '2026-10-01T10:00:00.000Z' }],
      });

      const res = await service.pinResource(instructor, 'cls-1', { title: 'Slides', url: 'https://example.com/slides', note: 'Chapter 4' });

      expect(res).toHaveLength(2);
      expect(res[1]).toMatchObject({ title: 'Slides', url: 'https://example.com/slides', note: 'Chapter 4' });
      expect(prisma.liveClass.update).toHaveBeenCalledWith(expect.objectContaining({ data: { pinnedResources: res } }));
    });

    it('refuses to pin once at the cap', async () => {
      const full = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, title: `R${i}`, url: 'https://example.com', note: null, pinnedAt: '2026-10-01T10:00:00.000Z' }));
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ pinnedResources: full });
      await expect(service.pinResource(instructor, 'cls-1', { title: 'One more', url: 'https://example.com' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.liveClass.update).not.toHaveBeenCalled();
    });

    it('unpins by id, and only the host may', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        pinnedResources: [
          { id: 'r1', title: 'Repo', url: 'https://example.com/repo', note: null, pinnedAt: '2026-10-01T10:00:00.000Z' },
          { id: 'r2', title: 'Slides', url: 'https://example.com/slides', note: null, pinnedAt: '2026-10-01T10:05:00.000Z' },
        ],
      });
      const res = await service.unpinResource(instructor, 'cls-1', 'r1');
      expect(res.map((r) => r.id)).toEqual(['r2']);

      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.unpinResource(learner, 'cls-1', 'r2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('poll', () => {
    function pollRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 'poll-1',
        question: 'How confident do you feel?',
        options: [
          { id: 'opt-1', text: 'Very' },
          { id: 'opt-2', text: 'Not yet' },
        ],
        votes: {},
        status: 'open',
        createdAt: '2026-10-01T10:00:00.000Z',
        closedAt: null,
        ...overrides,
      };
    }

    it('is null when no poll has been run yet', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ activePoll: null });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      expect(await service.getPoll(learner, 'cls-1')).toBeNull();
    });

    it('only the host can start one, and only while live', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.createPoll(learner, 'cls-1', { question: 'Q?', options: ['A', 'B'] })).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'ended' }));
      await expect(service.createPoll(instructor, 'cls-1', { question: 'Q?', options: ['A', 'B'] })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('the host sees a live tally while open; a learner does not', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        activePoll: pollRow({ votes: { [HOST_ID]: 'opt-1', [LEARNER_ID]: 'opt-1' } }),
      });
      const hostView = await service.getPoll(instructor, 'cls-1');
      expect(hostView?.results).toEqual({ 'opt-1': 2, 'opt-2': 0 });
      expect(hostView?.myVote).toBe('opt-1');

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        activePoll: pollRow({ votes: { [LEARNER_ID]: 'opt-2' } }),
      });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      const learnerView = await service.getPoll(learner, 'cls-1');
      expect(learnerView?.results).toBeNull();
      expect(learnerView?.myVote).toBe('opt-2');
    });

    it('reveals results to everyone once closed', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        activePoll: pollRow({ status: 'closed', votes: { [LEARNER_ID]: 'opt-2' } }),
      });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      const res = await service.getPoll(learner, 'cls-1');
      expect(res?.results).toEqual({ 'opt-1': 0, 'opt-2': 1 });
    });

    it('a second vote from the same person replaces their first, not adds another', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        activePoll: pollRow({ votes: { [LEARNER_ID]: 'opt-1' } }),
      });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });

      await service.votePoll(learner, 'cls-1', 'opt-2');

      const saved = prisma.liveClass.update.mock.calls[0][0].data.activePoll;
      expect(saved.votes).toEqual({ [LEARNER_ID]: 'opt-2' });
    });

    it('rejects a vote for an option that does not exist, or once the poll is closed', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ activePoll: pollRow() });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      await expect(service.votePoll(learner, 'cls-1', 'not-real')).rejects.toBeInstanceOf(BadRequestException);

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({
        activePoll: pollRow({ status: 'closed' }),
      });
      await expect(service.votePoll(learner, 'cls-1', 'opt-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('only the host can close it', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.closePoll(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('breakout rooms', () => {
    function breakoutsRow(overrides: Record<string, unknown> = {}) {
      return {
        rooms: [
          { id: 'room-1', name: 'Room 1' },
          { id: 'room-2', name: 'Room 2' },
        ],
        assignments: { [LEARNER_ID]: 'room-1' },
        startedAt: '2026-10-01T10:00:00.000Z',
        ...overrides,
      };
    }

    it('only the host can start breakout rooms, and only while live', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.startBreakouts(learner, 'cls-1', 3)).rejects.toBeInstanceOf(ForbiddenException);

      prisma.liveClass.findUnique.mockResolvedValue(classRow({ status: 'ended' }));
      await expect(service.startBreakouts(instructor, 'cls-1', 3)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an out-of-range room count', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.startBreakouts(instructor, 'cls-1', 1)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.startBreakouts(instructor, 'cls-1', 11)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('auto-splits whoever is actually connected (excluding the host) evenly across the rooms', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      const learnerIds = Array.from({ length: 5 }, (_, i) => `55555555-5555-4555-8555-55555555555${i}`);
      jest.spyOn(livekit, 'listParticipants').mockResolvedValue([HOST_ID, ...learnerIds]);
      prisma.profile.findMany.mockResolvedValue(learnerIds.map((id) => ({ id, name: `Student ${id.slice(-1)}` })));

      const res = await service.startBreakouts(instructor, 'cls-1', 2);

      expect(res.rooms).toHaveLength(2);
      const counts = res.rooms.map((r) => r.members.length);
      expect(counts.sort()).toEqual([2, 3]);
      // The host was excluded from assignment entirely.
      expect(res.rooms.flatMap((r) => r.members.map((m) => m.id))).not.toContain(HOST_ID);
    });

    it('is null when breakout rooms are not active', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: null });
      expect(await service.getBreakouts(instructor, 'cls-1')).toBeNull();
    });

    it("gives the learner their own room id, and null for the host who isn't assigned", async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      prisma.enrollment.findUnique.mockResolvedValue({ status: 'active' });
      prisma.profile.findMany.mockResolvedValue([{ id: LEARNER_ID, name: 'Ada' }]);
      const learnerView = await service.getBreakouts(learner, 'cls-1');
      expect(learnerView?.myRoomId).toBe('room-1');

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const hostView = await service.getBreakouts(instructor, 'cls-1');
      expect(hostView?.myRoomId).toBeNull();
    });

    it('moves a student to a different room, or back to the main room when roomId is null', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const res = await service.moveBreakout(instructor, 'cls-1', LEARNER_ID, 'room-2');
      expect(res.rooms.find((r) => r.id === 'room-2')?.members.map((m) => m.id)).toContain(LEARNER_ID);

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const back = await service.moveBreakout(instructor, 'cls-1', LEARNER_ID, null);
      expect(back.rooms.flatMap((r) => r.members.map((m) => m.id))).not.toContain(LEARNER_ID);
    });

    it('rejects moving to a room that does not exist, and only the host may move anyone', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      await expect(service.moveBreakout(instructor, 'cls-1', LEARNER_ID, 'not-real')).rejects.toBeInstanceOf(BadRequestException);

      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.moveBreakout(learner, 'cls-1', LEARNER_ID, 'room-2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('joinBreakout lets the host into any room, but a learner only their assigned one', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const hostJoin = await service.joinBreakout(instructor, 'cls-1', 'room-2');
      expect(hostJoin.roomName).toBe('Room 2');
      const claims = jwt.verify(hostJoin.token, process.env.LIVEKIT_API_SECRET as string) as { video: { room: string; roomAdmin?: boolean } };
      expect(claims.video.room).toBe('class-cls-1-bo-room-2');
      expect(claims.video.roomAdmin).toBe(true);

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      await expect(service.joinBreakout(learner, 'cls-1', 'room-2')).rejects.toBeInstanceOf(ForbiddenException);

      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const learnerJoin = await service.joinBreakout(learner, 'cls-1', 'room-1');
      expect(learnerJoin.roomId).toBe('room-1');
    });

    it('close deletes every breakout LiveKit room (best effort) and clears the assignment record', async () => {
      prisma.liveClass.findUnique.mockResolvedValueOnce(classRow()).mockResolvedValueOnce({ breakoutState: breakoutsRow() });
      const deleteRoom = jest.spyOn(livekit, 'deleteRoom').mockResolvedValue(undefined);

      await service.closeBreakouts(instructor, 'cls-1');

      expect(deleteRoom).toHaveBeenCalledWith('class-cls-1-bo-room-1');
      expect(deleteRoom).toHaveBeenCalledWith('class-cls-1-bo-room-2');
      expect(prisma.liveClass.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cls-1' } }));
    });

    it('only the host can close breakout rooms', async () => {
      prisma.liveClass.findUnique.mockResolvedValue(classRow());
      await expect(service.closeBreakouts(learner, 'cls-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('timetable listing', () => {
    it('scopes a learner to the courses they are enrolled in (not cancelled)', async () => {
      prisma.enrollment.findMany.mockResolvedValue([{ courseId: 'crs-1' }]);
      prisma.liveClass.findMany.mockResolvedValue([classRow()]);

      const res = await service.listForUser(learner);

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: LEARNER_ID, status: { not: 'cancelled' } } }),
      );
      expect(prisma.liveClass.findMany.mock.calls[0][0].where.courseId).toEqual({ in: ['crs-1'] });
      expect(res[0]).toMatchObject({ role: 'learner', joinState: 'open' });
    });

    it('scopes an instructor to the classes they host', async () => {
      prisma.liveClass.findMany.mockResolvedValue([]);
      await service.listForUser(instructor);
      expect(prisma.liveClass.findMany.mock.calls[0][0].where.hostUserId).toBe(HOST_ID);
    });
  });

  describe('attendance webhook', () => {
    it('adds the time between join and leave to the learner total', async () => {
      const joined = new Date('2026-10-05T17:00:00Z');
      const left = new Date('2026-10-05T17:30:00Z');
      prisma.liveClass.findUnique.mockResolvedValue({ id: 'cls-1', hostUserId: HOST_ID });
      prisma.profile.findUnique.mockResolvedValue({ role: 'learner' });
      prisma.liveClassAttendance.findUnique.mockResolvedValue({ lastJoinedAt: joined });

      await service.recordParticipantEvent('participant_left', 'class-cls-1', LEARNER_ID, left);

      expect(prisma.liveClassAttendance.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalSeconds: { increment: 1800 }, lastJoinedAt: null }) }),
      );
    });

    it('does not track the instructor as an attendee', async () => {
      prisma.liveClass.findUnique.mockResolvedValue({ id: 'cls-1', hostUserId: HOST_ID });
      await service.recordParticipantEvent('participant_joined', 'class-cls-1', HOST_ID, new Date());
      expect(prisma.liveClassAttendance.upsert).not.toHaveBeenCalled();
    });
  });
});

describe('LiveKitService.verifyWebhook', () => {
  const secret = 'test-secret-value-that-is-long-enough';
  const service = new LiveKitService();

  beforeEach(() => {
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
    process.env.LIVEKIT_API_KEY = 'APItestkey';
    process.env.LIVEKIT_API_SECRET = secret;
  });
  afterEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  const body = Buffer.from(JSON.stringify({ event: 'participant_joined' }));
  const sign = (sha256: string, key = secret) =>
    jwt.sign({ sha256 }, key, { algorithm: 'HS256', issuer: 'APItestkey', expiresIn: 60 });

  it('accepts a correctly signed webhook for the exact body', () => {
    const digest = createHash('sha256').update(body).digest('base64');
    expect(service.verifyWebhook(sign(digest), body)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, and a missing header', () => {
    const digest = createHash('sha256').update(body).digest('base64');
    expect(service.verifyWebhook(sign(digest), Buffer.from('{"event":"other"}'))).toBe(false);
    expect(service.verifyWebhook(sign(digest, 'another-secret-another-secret-123'), body)).toBe(false);
    expect(service.verifyWebhook(undefined, body)).toBe(false);
  });
});
