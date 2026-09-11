import { Test } from '@nestjs/testing';
import type { Me } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthController } from './auth.controller';
import { ProfileService } from './profile.service';

const ME: Me = {
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
};

describe('AuthController', () => {
  let controller: AuthController;
  let profiles: { getMe: jest.Mock };

  beforeEach(async () => {
    profiles = { getMe: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('delegates to ProfileService.getMe with the authenticated user id', async () => {
    profiles.getMe.mockResolvedValueOnce(ME);
    await expect(controller.getMe({ userId: 'user-1', role: 'learner' })).resolves.toEqual(ME);
    expect(profiles.getMe).toHaveBeenCalledWith('user-1');
  });
});
