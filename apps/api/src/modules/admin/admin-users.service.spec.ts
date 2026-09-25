import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { generateTemporaryPassword } from '../../common/supabase-admin/supabase-admin.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const NEW_USER = '33333333-3333-4333-8333-333333333333';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: {
    profile: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; update: jest.Mock; upsert: jest.Mock };
    liveClass: { count: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let supabase: { createUser: jest.Mock; setPassword: jest.Mock; tryBan: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn(),
      },
      liveClass: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    supabase = { createUser: jest.fn(), setPassword: jest.fn(), tryBan: jest.fn() };
    audit = { record: jest.fn() };
    service = new AdminUsersService(prisma as never, supabase as never, audit as never);
  });

  describe('suspend / reactivate', () => {
    it('suspends an active student, bans the session, and writes an audit entry', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'learner', status: 'active' });
      const res = await service.suspend(ADMIN, STUDENT, '  Repeated abuse  ');

      expect(res).toEqual({ id: STUDENT, status: 'suspended', affectedUpcomingClasses: 0 });
      expect(prisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'suspended', suspendedReason: 'Repeated abuse' }) }),
      );
      expect(supabase.tryBan).toHaveBeenCalledWith(STUDENT, true);
      expect(audit.record).toHaveBeenCalledWith(
        ADMIN,
        'user.suspend',
        'user',
        STUDENT,
        expect.objectContaining({ reason: 'Repeated abuse' }),
      );
    });

    it('reports the upcoming classes an instructor still hosts when suspending them', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'instructor', status: 'active' });
      prisma.liveClass.count.mockResolvedValue(6);
      const res = await service.suspend(ADMIN, STUDENT, 'Left the programme');
      expect(res.affectedUpcomingClasses).toBe(6);
    });

    it('refuses to suspend yourself, an admin, or a missing account', async () => {
      await expect(service.suspend(ADMIN, ADMIN, 'reason here')).rejects.toBeInstanceOf(ForbiddenException);

      prisma.profile.findUnique.mockResolvedValue({ role: 'admin', status: 'active' });
      await expect(service.suspend(ADMIN, STUDENT, 'reason here')).rejects.toBeInstanceOf(BadRequestException);

      prisma.profile.findUnique.mockResolvedValue(null);
      await expect(service.suspend(ADMIN, STUDENT, 'reason here')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('will not suspend an account that is not active', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'learner', status: 'suspended' });
      await expect(service.suspend(ADMIN, STUDENT, 'reason here')).rejects.toBeInstanceOf(ConflictException);
    });

    it('reactivates only an admin-suspended account (not one the user deleted themselves)', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'learner', status: 'pending_deletion' });
      await expect(service.reactivate(ADMIN, STUDENT)).rejects.toBeInstanceOf(ConflictException);

      prisma.profile.findUnique.mockResolvedValue({ role: 'learner', status: 'suspended' });
      const res = await service.reactivate(ADMIN, STUDENT);
      expect(res.status).toBe('active');
      expect(supabase.tryBan).toHaveBeenCalledWith(STUDENT, false);
      expect(prisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'active', suspendedAt: null, suspendedReason: null } }),
      );
    });
  });

  describe('createInstructor', () => {
    it('creates the login with a generated password, marks the profile as an instructor who must change it, and returns the password once', async () => {
      supabase.createUser.mockResolvedValue(NEW_USER);
      prisma.profile.upsert.mockResolvedValue({
        id: NEW_USER,
        name: 'Grace Okoro',
        headline: null,
        status: 'active',
        createdAt: new Date('2026-09-26T10:00:00Z'),
        suspendedReason: null,
      });

      const res = await service.createInstructor(ADMIN, { name: ' Grace Okoro ', email: 'Grace@AIIT.network' });

      const [email, password, name] = supabase.createUser.mock.calls[0];
      expect(email).toBe('grace@aiit.network');
      expect(name).toBe('Grace Okoro');
      expect(password).toBe(res.temporaryPassword);
      expect(res.temporaryPassword).toHaveLength(14);
      expect(prisma.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ role: 'instructor', mustChangePassword: true, createdBy: ADMIN }),
        }),
      );
      expect(res.instructor).toMatchObject({ id: NEW_USER, email: 'grace@aiit.network', status: 'active' });
      // The password must never be written to the audit trail.
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain(res.temporaryPassword);
    });

    it('does not touch the database when the login already exists', async () => {
      supabase.createUser.mockRejectedValue(new ConflictException('exists'));
      await expect(
        service.createInstructor(ADMIN, { name: 'Grace', email: 'grace@aiit.network' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.profile.upsert).not.toHaveBeenCalled();
    });
  });

  it('only resets the password of an instructor', async () => {
    prisma.profile.findFirst.mockResolvedValue(null);
    await expect(service.resetInstructorPassword(ADMIN, STUDENT)).rejects.toBeInstanceOf(NotFoundException);
    expect(supabase.setPassword).not.toHaveBeenCalled();
  });

  it('generates readable temporary passwords with upper, lower and a digit', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = generateTemporaryPassword();
      expect(p).toMatch(/^[A-Za-z0-9!@#$%&*?]{14}$/);
      expect(p).toMatch(/[!@#$%&*?]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      expect(p.replace(/[!@#$%&*?]/g, '')).not.toMatch(/[0OIl1]/);
    }
  });
});
