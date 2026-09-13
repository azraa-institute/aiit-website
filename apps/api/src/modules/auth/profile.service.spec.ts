import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { ProfileService } from './profile.service';

const PROFILE = {
  id: 'user-1',
  role: 'learner',
  status: 'active',
  name: null,
  headline: null,
  country: null,
  avatarKey: null,
  preferences: {},
  deletionRequestedAt: null,
  welcomedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: {
    profile: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  };
  let email: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      profile: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  it('returns the mapped profile for getMe (already welcomed -- no email sent)', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(PROFILE);
    await expect(service.getMe('user-1', 'ada@example.com')).resolves.toEqual({
      id: 'user-1',
      role: 'learner',
      status: 'active',
      name: null,
      headline: null,
      country: null,
      avatarKey: null,
      preferences: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      isNewSignup: false,
    });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(prisma.profile.updateMany).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when getMe finds no profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    await expect(service.getMe('missing', 'ada@example.com')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sends a welcome email exactly once, the first time getMe sees an unwelcomed profile, and reports isNewSignup', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, welcomedAt: null });
    prisma.profile.updateMany.mockResolvedValueOnce({ count: 1 });

    const me = await service.getMe('user-1', 'ada@example.com');

    expect(prisma.profile.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', welcomedAt: null },
      data: { welcomedAt: expect.any(Date) },
    });
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com', subject: expect.stringContaining('Welcome') }),
    );
    expect(me.isNewSignup).toBe(true);
  });

  it('does not send a welcome email when another request already claimed it (race), and reports isNewSignup false', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, welcomedAt: null });
    prisma.profile.updateMany.mockResolvedValueOnce({ count: 0 });

    const me = await service.getMe('user-1', 'ada@example.com');

    expect(email.send).not.toHaveBeenCalled();
    expect(me.isNewSignup).toBe(false);
  });

  it('skips the welcome email (without failing the request) when the JWT has no email claim, but still reports isNewSignup', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, welcomedAt: null });
    prisma.profile.updateMany.mockResolvedValueOnce({ count: 1 });

    const me = await service.getMe('user-1', undefined);
    expect(email.send).not.toHaveBeenCalled();
    expect(me.isNewSignup).toBe(true);
  });

  it('updateProfile only sends fields present on the dto', async () => {
    prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, name: 'Ada' });
    await service.updateProfile('user-1', { name: 'Ada' });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Ada' },
    });
  });

  it('updatePreferences replaces the preferences JSON blob', async () => {
    prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, preferences: { theme: 'dark' } });
    await service.updatePreferences('user-1', { preferences: { theme: 'dark' } });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { preferences: { theme: 'dark' } },
    });
  });

  it('requestDeletion marks the profile pending_deletion with a timestamp', async () => {
    prisma.profile.update.mockResolvedValueOnce(PROFILE);
    await service.requestDeletion('user-1');
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'pending_deletion', deletionRequestedAt: expect.any(Date) },
    });
  });
});
