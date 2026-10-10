import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { SupabaseAdminService } from '../../common/supabase-admin/supabase-admin.service';
import { ProfileService } from './profile.service';

const PROFILE = {
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
  deletionRequestedAt: null,
  welcomedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ProfileService', () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let service: ProfileService;
  let prisma: {
    profile: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let email: { send: jest.Mock };
  let supabaseAdmin: { uploadToStorage: jest.Mock; removeFromStorage: jest.Mock };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  afterAll(() => {
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  beforeEach(async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    prisma = {
      profile: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    email = { send: jest.fn() };
    supabaseAdmin = { uploadToStorage: jest.fn().mockResolvedValue(undefined), removeFromStorage: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: SupabaseAdminService, useValue: supabaseAdmin },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns the mapped profile for getMe (already welcomed -- no email sent)', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(PROFILE);
    await expect(service.getMe('user-1', 'ada@example.com')).resolves.toEqual({
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
    });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(prisma.profile.updateMany).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('profileComplete is true once the minimal required tier (name/phone/country/qualification) is set, even with phoneVerifiedAt still null -- verification is paused (Twilio), not gating', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({
      ...PROFILE,
      name: 'Ada Lovelace',
      phone: '+14155552671',
      qualification: "Bachelor's",
      country: 'NG',
    });
    const me = await service.getMe('user-1', 'ada@example.com');
    expect(me.profileComplete).toBe(true);
    expect(me.phoneVerifiedAt).toBeNull();
    // Non-required fields never gate completeness -- confirm they're simply
    // reported as still-empty, not silently required after all.
    expect(me.university).toBeNull();
    expect(me.city).toBeNull();
  });

  it('profileComplete stays false while any of the minimal required tier is missing, regardless of how much else is filled in', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({
      ...PROFILE,
      name: 'Ada Lovelace',
      phone: '+14155552671',
      qualification: "Bachelor's",
      country: null, // the one missing required field
      university: 'Example University',
      fieldOfStudy: 'Computer Science',
      currentStatus: 'student',
      learningGoal: 'Advance my career',
      areasOfInterest: ['ai', 'cybersecurity'],
      timeZone: 'Africa/Lagos',
      city: 'Lagos',
      address: '1 Example Street',
      postalCode: '100001',
    });
    const me = await service.getMe('user-1', 'ada@example.com');
    expect(me.profileComplete).toBe(false);
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

  it('updateProfile includes phone when present on the dto (including clearing it to empty), and clears any previous verification', async () => {
    prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, phone: '' });
    await service.updateProfile('user-1', { phone: '' });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { phone: '', phoneVerifiedAt: null },
    });
  });

  it('updateProfile includes the new profile-completion fields when present on the dto', async () => {
    prisma.profile.update.mockResolvedValueOnce(PROFILE);
    await service.updateProfile('user-1', {
      qualification: "Bachelor's",
      university: 'Example University',
      state: 'Lagos',
      city: 'Lagos',
      address: '1 Example Street',
      postalCode: '100001',
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        qualification: "Bachelor's",
        university: 'Example University',
        state: 'Lagos',
        city: 'Lagos',
        address: '1 Example Street',
        postalCode: '100001',
      },
    });
  });

  it('updateProfile includes the goals-step fields when present on the dto', async () => {
    prisma.profile.update.mockResolvedValueOnce(PROFILE);
    await service.updateProfile('user-1', {
      fieldOfStudy: 'Computer Science',
      currentStatus: 'student',
      learningGoal: 'Advance my career',
      areasOfInterest: ['ai', 'cybersecurity'],
      timeZone: 'Africa/Lagos',
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        fieldOfStudy: 'Computer Science',
        currentStatus: 'student',
        learningGoal: 'Advance my career',
        areasOfInterest: ['ai', 'cybersecurity'],
        timeZone: 'Africa/Lagos',
      },
    });
  });

  describe('confirmPhoneVerification', () => {
    it('throws when the profile has no phone set', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, phone: null });
      await expect(service.confirmPhoneVerification('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when Supabase env vars are not configured', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, phone: '+14155552671' });
      await expect(service.confirmPhoneVerification('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the auth user phone is not confirmed', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
      prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, phone: '+14155552671' });
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ phone: '14155552671', phone_confirmed_at: null }), { status: 200 }),
      );
      await expect(service.confirmPhoneVerification('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists phoneVerifiedAt when the auth user phone is confirmed and matches', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
      prisma.profile.findUnique.mockResolvedValueOnce({ ...PROFILE, phone: '+14155552671' });
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ phone: '14155552671', phone_confirmed_at: '2026-02-01T00:00:00.000Z' }),
          { status: 200 },
        ),
      );
      prisma.profile.update.mockResolvedValueOnce({
        ...PROFILE,
        phone: '+14155552671',
        phoneVerifiedAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      const me = await service.confirmPhoneVerification('user-1');

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phoneVerifiedAt: new Date('2026-02-01T00:00:00.000Z') },
      });
      expect(me.phoneVerifiedAt).toBe('2026-02-01T00:00:00.000Z');
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

  describe('requestDeletion', () => {
    it('marks the profile pending_deletion with a timestamp', async () => {
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      await service.requestDeletion('user-1', 'ada@example.com');
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'pending_deletion', deletionRequestedAt: expect.any(Date) },
      });
    });

    it('sends an account-deleted email to the caller', async () => {
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      await service.requestDeletion('user-1', 'ada@example.com');
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ada@example.com', subject: expect.stringContaining('deleted') }),
      );
    });

    it('skips the email (without throwing) when the JWT has no email claim', async () => {
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      await expect(service.requestDeletion('user-1', undefined)).resolves.toBeUndefined();
      expect(email.send).not.toHaveBeenCalled();
    });

    it('does not attempt to ban the Supabase user when SUPABASE_SERVICE_ROLE_KEY is unset', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      await service.requestDeletion('user-1', 'ada@example.com');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('bans the Supabase user via the Admin API when configured', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
      prisma.profile.update.mockResolvedValueOnce(PROFILE);

      await service.requestDeletion('user-1', 'ada@example.com');

      expect(fetchSpy).toHaveBeenCalledWith(
        new URL('https://test-project.supabase.co/auth/v1/admin/users/user-1'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            apikey: 'service-role-secret',
            Authorization: 'Bearer service-role-secret',
          }),
          body: JSON.stringify({ ban_duration: '876000h' }),
        }),
      );
    });

    it('does not throw when the Supabase ban call fails', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      fetchSpy.mockResolvedValueOnce(new Response('nope', { status: 500 }));

      await expect(service.requestDeletion('user-1', 'ada@example.com')).resolves.toBeUndefined();
    });

    it('does not throw when the Supabase ban call rejects outright', async () => {
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
      prisma.profile.update.mockResolvedValueOnce(PROFILE);
      fetchSpy.mockRejectedValueOnce(new Error('network down'));

      await expect(service.requestDeletion('user-1', 'ada@example.com')).resolves.toBeUndefined();
    });
  });

  describe('emailExists', () => {
    it('returns true when the raw query finds a matching auth.users row', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ exists: true }]);
      await expect(service.emailExists('ada@example.com')).resolves.toBe(true);
    });

    it('returns false when no row matches', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ exists: false }]);
      await expect(service.emailExists('nobody@example.com')).resolves.toBe(false);
    });
  });

  describe('accountStatus', () => {
    it('reports suspended for a suspended account', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ status: 'suspended' }]);
      await expect(service.accountStatus('ada@example.com')).resolves.toBe('suspended');
    });

    it('reports active for any other real status', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ status: 'active' }]);
      await expect(service.accountStatus('ada@example.com')).resolves.toBe('active');
      prisma.$queryRaw.mockResolvedValueOnce([{ status: 'pending_deletion' }]);
      await expect(service.accountStatus('ada@example.com')).resolves.toBe('active');
    });

    it('reports not_found when no account matches that email', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      await expect(service.accountStatus('nobody@example.com')).resolves.toBe('not_found');
    });
  });

  describe('uploadAvatar', () => {
    const file = {
      originalname: 'photo.JPG',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
    } as Express.Multer.File;

    it('throws NotFoundException when the profile does not exist', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce(null);
      await expect(service.uploadAvatar('user-1', file)).rejects.toBeInstanceOf(NotFoundException);
      expect(supabaseAdmin.uploadToStorage).not.toHaveBeenCalled();
    });

    it('uploads via the service-role client with a unique key, lower-cased extension, and persists it', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ avatarKey: null });
      prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, avatarKey: 'user-1/avatar-123.jpg' });
      jest.spyOn(Date, 'now').mockReturnValueOnce(123);

      const me = await service.uploadAvatar('user-1', file);

      expect(supabaseAdmin.uploadToStorage).toHaveBeenCalledWith(
        'avatars',
        'user-1/avatar-123.jpg',
        file.buffer,
        'image/jpeg',
      );
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarKey: 'user-1/avatar-123.jpg' },
      });
      expect(me.avatarKey).toBe('user-1/avatar-123.jpg');
    });

    it('best-effort cleans up the previous avatar without failing the request if cleanup fails', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ avatarKey: 'user-1/avatar-old.jpg' });
      prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, avatarKey: 'user-1/avatar-456.jpg' });
      jest.spyOn(Date, 'now').mockReturnValueOnce(456);
      supabaseAdmin.removeFromStorage.mockRejectedValueOnce(new Error('cleanup failed'));

      await expect(service.uploadAvatar('user-1', file)).resolves.toMatchObject({ avatarKey: 'user-1/avatar-456.jpg' });
      // Cleanup is fire-and-forget -- give its rejection a tick to settle before asserting.
      await Promise.resolve();
      expect(supabaseAdmin.removeFromStorage).toHaveBeenCalledWith('avatars', 'user-1/avatar-old.jpg');
    });

    it('does not attempt cleanup when there was no previous avatar', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ avatarKey: null });
      prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, avatarKey: 'user-1/avatar-789.jpg' });

      await service.uploadAvatar('user-1', file);

      expect(supabaseAdmin.removeFromStorage).not.toHaveBeenCalled();
    });
  });

  describe('removeAvatar', () => {
    it('throws NotFoundException when the profile does not exist', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce(null);
      await expect(service.removeAvatar('user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the stored file and clears avatarKey when one is set', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ avatarKey: 'user-1/avatar-old.jpg' });
      prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, avatarKey: null });

      const me = await service.removeAvatar('user-1');

      expect(supabaseAdmin.removeFromStorage).toHaveBeenCalledWith('avatars', 'user-1/avatar-old.jpg');
      expect(prisma.profile.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { avatarKey: null } });
      expect(me.avatarKey).toBeNull();
    });

    it('skips the Storage call (not an error) when there was nothing to remove', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ avatarKey: null });
      prisma.profile.update.mockResolvedValueOnce({ ...PROFILE, avatarKey: null });

      await service.removeAvatar('user-1');

      expect(supabaseAdmin.removeFromStorage).not.toHaveBeenCalled();
    });
  });

  // notifyPasswordChanged and notify2faEnabled tests removed along with
  // the methods themselves -- see the comment in profile.service.ts.
});
