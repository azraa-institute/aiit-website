import { Test } from '@nestjs/testing';
import type { Me } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

const ME: Me = {
  id: 'user-1',
  role: 'learner',
  status: 'active',
  name: 'Ada',
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

const USER = { userId: 'user-1', role: 'learner' as const, email: 'ada@example.com' };

describe('ProfileController', () => {
  let controller: ProfileController;
  let profiles: {
    updateProfile: jest.Mock;
    updatePreferences: jest.Mock;
    requestDeletion: jest.Mock;
    confirmPhoneVerification: jest.Mock;
  };

  beforeEach(async () => {
    profiles = {
      updateProfile: jest.fn(),
      updatePreferences: jest.fn(),
      requestDeletion: jest.fn(),
      confirmPhoneVerification: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(ProfileController);
  });

  it('delegates PATCH / to ProfileService.updateProfile', async () => {
    profiles.updateProfile.mockResolvedValueOnce(ME);
    await expect(controller.updateProfile(USER, { name: 'Ada' })).resolves.toEqual(ME);
    expect(profiles.updateProfile).toHaveBeenCalledWith('user-1', { name: 'Ada' });
  });

  it('delegates PATCH /preferences to ProfileService.updatePreferences', async () => {
    profiles.updatePreferences.mockResolvedValueOnce(ME);
    await expect(
      controller.updatePreferences(USER, { preferences: { theme: 'dark' } }),
    ).resolves.toEqual(ME);
    expect(profiles.updatePreferences).toHaveBeenCalledWith('user-1', {
      preferences: { theme: 'dark' },
    });
  });

  it('delegates POST /phone/confirm to ProfileService.confirmPhoneVerification', async () => {
    profiles.confirmPhoneVerification.mockResolvedValueOnce(ME);
    await expect(controller.confirmPhoneVerification(USER)).resolves.toEqual(ME);
    expect(profiles.confirmPhoneVerification).toHaveBeenCalledWith('user-1');
  });

  it('delegates DELETE / to ProfileService.requestDeletion with the caller email', async () => {
    profiles.requestDeletion.mockResolvedValueOnce(undefined);
    await controller.requestDeletion(USER);
    expect(profiles.requestDeletion).toHaveBeenCalledWith('user-1', 'ada@example.com');
  });
});
