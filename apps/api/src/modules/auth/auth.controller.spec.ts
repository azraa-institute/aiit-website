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
  phone: null,
  phoneVerifiedAt: null,
  qualification: null,
  university: null,
  fieldOfStudy: null,
  currentStatus: null,
  learningGoal: null,
  areasOfInterest: [],
  timeZone: null,
  country: null,
  state: null,
  city: null,
  address: null,
  postalCode: null,
  avatarKey: null,
  preferences: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  isNewSignup: false,
  profileComplete: false,
};

describe('AuthController', () => {
  let controller: AuthController;
  let profiles: { getMe: jest.Mock; emailExists: jest.Mock };

  beforeEach(async () => {
    profiles = { getMe: jest.fn(), emailExists: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('delegates to ProfileService.getMe with the authenticated user id and email', async () => {
    profiles.getMe.mockResolvedValueOnce(ME);
    await expect(
      controller.getMe({ userId: 'user-1', role: 'learner', email: 'ada@example.com' }),
    ).resolves.toEqual(ME);
    expect(profiles.getMe).toHaveBeenCalledWith('user-1', 'ada@example.com');
  });

  describe('emailExists', () => {
    it('reports true for a registered email', async () => {
      profiles.emailExists.mockResolvedValueOnce(true);
      await expect(controller.emailExists({ email: 'ada@example.com' })).resolves.toEqual({ exists: true });
      expect(profiles.emailExists).toHaveBeenCalledWith('ada@example.com');
    });

    it('reports false for an unregistered email', async () => {
      profiles.emailExists.mockResolvedValueOnce(false);
      await expect(controller.emailExists({ email: 'nobody@example.com' })).resolves.toEqual({ exists: false });
    });
  });
});
