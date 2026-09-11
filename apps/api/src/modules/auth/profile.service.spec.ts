import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: { profile: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = { profile: { findUnique: jest.fn(), update: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [ProfileService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  it('returns the mapped profile for getMe', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(PROFILE);
    await expect(service.getMe('user-1')).resolves.toEqual({
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
    });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('throws NotFoundException when getMe finds no profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    await expect(service.getMe('missing')).rejects.toBeInstanceOf(NotFoundException);
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
