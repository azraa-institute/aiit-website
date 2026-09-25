import { createHash } from 'crypto';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
