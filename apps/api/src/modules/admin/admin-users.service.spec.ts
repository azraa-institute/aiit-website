import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    auditLog: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let supabase: { createUser: jest.Mock; setPassword: jest.Mock; tryBan: jest.Mock };
  let audit: { record: jest.Mock };
  let enrollments: { adminEnroll: jest.Mock; adminCancel: jest.Mock };
  let email: { send: jest.Mock };

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
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    supabase = { createUser: jest.fn(), setPassword: jest.fn(), tryBan: jest.fn() };
    audit = { record: jest.fn() };
    enrollments = { adminEnroll: jest.fn(), adminCancel: jest.fn() };
    email = { send: jest.fn() };
    service = new AdminUsersService(prisma as never, supabase as never, audit as never, enrollments as never, email as never);
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

      const res = await service.createInstructor(ADMIN, { name: ' Grace Okoro ', email: 'Grace@AIIT.network' }, '203.0.113.4');

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
        service.createInstructor(ADMIN, { name: 'Grace', email: 'grace@aiit.network' }, undefined),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.profile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    it('creates the login with a generated password, marks the profile as admin who must change it, and returns the password once', async () => {
      supabase.createUser.mockResolvedValue(NEW_USER);
      prisma.profile.upsert.mockResolvedValue({ id: NEW_USER, name: 'Grace Okoro', createdAt: new Date('2026-09-26T10:00:00Z') });

      const res = await service.createAdmin(ADMIN, { name: ' Grace Okoro ', email: 'Grace@AIIT.network' }, '203.0.113.4');

      expect(supabase.createUser).toHaveBeenCalledWith('grace@aiit.network', expect.any(String), 'Grace Okoro', undefined, '203.0.113.4');
      expect(prisma.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ role: 'admin', mustChangePassword: true, createdBy: ADMIN }) }),
      );
      expect(res.admin).toMatchObject({ id: NEW_USER, email: 'grace@aiit.network' });
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'admin.create', 'user', NEW_USER, { email: 'grace@aiit.network' });
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain(res.temporaryPassword);
    });
  });

  describe('deleteStaff', () => {
    it('refuses to let an admin delete their own account this way', async () => {
      await expect(service.deleteStaff(ADMIN, ADMIN, 'Reason')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.profile.update).not.toHaveBeenCalled();
    });

    it('404s for a missing account', async () => {
      prisma.profile.findUnique.mockResolvedValue(null);
      await expect(service.deleteStaff(ADMIN, STUDENT, 'Reason')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a learner target -- only instructor accounts are deletable here', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'learner', status: 'active' });
      await expect(service.deleteStaff(ADMIN, STUDENT, 'Reason')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an admin target -- same block as suspension', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'admin', status: 'active' });
      await expect(service.deleteStaff(ADMIN, STUDENT, 'Reason')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an already-pending-deletion account', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'instructor', status: 'pending_deletion' });
      await expect(service.deleteStaff(ADMIN, STUDENT, 'Reason')).rejects.toBeInstanceOf(ConflictException);
    });

    it('soft-deletes the instructor, bans their session, emails them, and records an audit entry', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'instructor', status: 'active' });
      prisma.$queryRaw.mockResolvedValueOnce([{ id: STUDENT, email: 'grace@aiit.network' }]);

      const res = await service.deleteStaff(ADMIN, STUDENT, '  No longer with AIIT  ');

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: STUDENT },
        data: { status: 'pending_deletion', deletionRequestedAt: expect.any(Date) },
      });
      expect(supabase.tryBan).toHaveBeenCalledWith(STUDENT, true);
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'instructor.delete', 'user', STUDENT, { reason: 'No longer with AIIT' });
      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'grace@aiit.network' }));
      expect(res).toEqual({ id: STUDENT, status: 'pending_deletion', affectedUpcomingClasses: 0 });
    });

    it('still deletes even when no email is on file -- email is best-effort', async () => {
      prisma.profile.findUnique.mockResolvedValue({ role: 'instructor', status: 'active' });
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await service.deleteStaff(ADMIN, STUDENT, 'Reason');

      expect(prisma.profile.update).toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });
  });

  describe('adminEnroll / adminUnenroll', () => {
    it('404s when the target is not a learner', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      await expect(service.adminEnroll(ADMIN, STUDENT, 'course-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(enrollments.adminEnroll).not.toHaveBeenCalled();
    });

    it('enrolls the student and records an audit entry', async () => {
      prisma.profile.findFirst.mockResolvedValue({ id: STUDENT, role: 'learner' });
      await service.adminEnroll(ADMIN, STUDENT, 'course-1');
      expect(enrollments.adminEnroll).toHaveBeenCalledWith(STUDENT, 'course-1');
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'enrollment.admin_enroll', 'user', STUDENT, { courseId: 'course-1' });
    });

    it('unenrolls the student and records an audit entry', async () => {
      prisma.profile.findFirst.mockResolvedValue({ id: STUDENT, role: 'learner' });
      await service.adminUnenroll(ADMIN, STUDENT, 'course-1');
      expect(enrollments.adminCancel).toHaveBeenCalledWith(STUDENT, 'course-1');
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'enrollment.admin_unenroll', 'user', STUDENT, { courseId: 'course-1' });
    });
  });

  it('only resets the password of an instructor', async () => {
    prisma.profile.findFirst.mockResolvedValue(null);
    await expect(service.resetInstructorPassword(ADMIN, STUDENT)).rejects.toBeInstanceOf(NotFoundException);
    expect(supabase.setPassword).not.toHaveBeenCalled();
  });

  describe('auditLog', () => {
    it('queries with no WHERE clause when no filters are given', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
      const res = await service.auditLog({});
      expect(res).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
      // The tagged-template call's first substitution is the WHERE fragment -- Prisma.empty when unfiltered.
      expect(prisma.$queryRaw.mock.calls[0][1]).toBe(Prisma.empty);
    });

    it('maps rows including a free-text match and paginates from the total', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'a1',
            actor_id: ADMIN,
            actor_name: 'Grace Okoro',
            action: 'user.suspend',
            target_type: 'user',
            target_id: STUDENT,
            metadata: { reason: 'Repeated abuse' },
            created_at: new Date('2026-09-29T10:00:00Z'),
          },
        ])
        .mockResolvedValueOnce([{ total: 1 }]);

      const res = await service.auditLog({ q: 'abuse', page: 1 });

      expect(res.items).toEqual([
        {
          id: 'a1',
          actorId: ADMIN,
          actorName: 'Grace Okoro',
          action: 'user.suspend',
          targetType: 'user',
          targetId: STUDENT,
          metadata: { reason: 'Repeated abuse' },
          createdAt: '2026-09-29T10:00:00.000Z',
        },
      ]);
      expect(res.total).toBe(1);
      expect(prisma.$queryRaw.mock.calls[0][1]).not.toBe(Prisma.empty);
    });
  });

  it('lists the distinct action names for the filter dropdown', async () => {
    prisma.auditLog.findMany.mockResolvedValue([{ action: 'user.suspend' }, { action: 'user.reactivate' }]);
    await expect(service.auditActions()).resolves.toEqual(['user.suspend', 'user.reactivate']);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ['action'] }),
    );
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
