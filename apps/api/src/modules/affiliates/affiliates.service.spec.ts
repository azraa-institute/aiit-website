import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';
import type { ApplyNewAffiliateDto } from './dto/apply-new-affiliate.dto';

const USER = '11111111-1111-4111-8111-111111111111';
const AFFILIATE_ID = '22222222-2222-4222-8222-222222222222';
const IP = '203.0.113.7';

describe('AffiliatesService', () => {
  let service: AffiliatesService;
  let prisma: {
    affiliate: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    profile: { count: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let email: { send: jest.Mock };
  let supabase: { createUser: jest.Mock };

  beforeEach(() => {
    prisma = {
      affiliate: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      profile: { count: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    audit = { record: jest.fn() };
    email = { send: jest.fn().mockResolvedValue(undefined) };
    supabase = { createUser: jest.fn() };
    service = new AffiliatesService(prisma as never, audit as never, email as never, supabase as never);
  });

  it('creates a pending application, capturing the signature, and audits it', async () => {
    prisma.affiliate.create.mockResolvedValue({
      id: AFFILIATE_ID,
      userId: USER,
      type: 'creator',
      applicationStatus: 'pending',
      referralSlug: 'abc123',
      referenceCode: 'AIIT-AFF-ABC123',
      activatedAt: null,
      rejectionReason: null,
    });

    const result = await service.apply(USER, 'creator', '  Ada Lovelace  ', IP);

    expect(result).toEqual(
      expect.objectContaining({ hasApplied: true, type: 'creator', applicationStatus: 'pending', activated: false, referralLink: null, registrationCount: null }),
    );
    expect(prisma.affiliate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signedName: 'Ada Lovelace',
        signedIp: IP,
        agreementVersion: AFFILIATE_AGREEMENT_VERSION,
        signedAt: expect.any(Date),
        referenceCode: expect.stringMatching(/^AIIT-AFF-[0-9A-F]{6}$/),
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(USER, 'affiliate.apply', 'affiliate', AFFILIATE_ID, { type: 'creator' });
  });

  it('turns a duplicate application (unique-index conflict) into a ConflictException', async () => {
    prisma.affiliate.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.apply(USER, 'student', 'Grace Hopper', IP)).rejects.toBeInstanceOf(ConflictException);
  });

  it('getOwnSignedRecord 404s for someone who never signed', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(null);
    await expect(service.getOwnSignedRecord(USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getOwnSignedRecord returns the row once signed', async () => {
    const row = { id: AFFILIATE_ID, userId: USER, signedAt: new Date(), signedName: 'Ada Lovelace' };
    prisma.affiliate.findUnique.mockResolvedValue(row);
    await expect(service.getOwnSignedRecord(USER)).resolves.toBe(row);
  });

  it('reports no application for someone who never applied', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(null);
    await expect(service.me(USER)).resolves.toEqual({
      hasApplied: false,
      type: null,
      applicationStatus: null,
      rejectionReason: null,
      activated: false,
      referralLink: null,
      registrationCount: null,
    });
  });

  it('withholds the referral link and count until the application is approved', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      type: 'student',
      applicationStatus: 'in_review',
      referralSlug: 'abc123',
      activatedAt: null,
      rejectionReason: null,
    });

    const result = await service.me(USER);

    expect(result.referralLink).toBeNull();
    expect(result.registrationCount).toBeNull();
    expect(prisma.profile.count).not.toHaveBeenCalled();
  });

  it('withholds the referral link even once approved, until the reference code is activated', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      type: 'affiliate_to_affiliate',
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: null,
      rejectionReason: null,
    });
    prisma.profile.count.mockResolvedValue(7);

    const result = await service.me(USER);

    expect(result.activated).toBe(false);
    expect(result.referralLink).toBeNull();
    // Registration count is still shown once approved, independent of activation.
    expect(result.registrationCount).toBe(7);
  });

  it('includes the referral link once approved AND activated', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      type: 'affiliate_to_affiliate',
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: new Date(),
      rejectionReason: null,
    });
    prisma.profile.count.mockResolvedValue(7);

    const result = await service.me(USER);

    expect(result.activated).toBe(true);
    expect(result.referralLink).toBe('https://aiit.network/r/abc123');
    expect(result.registrationCount).toBe(7);
    expect(prisma.profile.count).toHaveBeenCalledWith({ where: { referredByAffiliateId: AFFILIATE_ID } });
  });

  describe('applyNew', () => {
    const dto: ApplyNewAffiliateDto = {
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      type: 'creator',
      signedName: 'Ada Lovelace',
      agreedToTerms: true,
    };

    it('creates the Supabase account, upserts a learner profile flagged mustChangePassword, creates the Affiliate row, and emails the credentials', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({
        id: AFFILIATE_ID,
        userId: USER,
        referenceCode: 'AIIT-AFF-ABC123',
      });

      await service.applyNew(dto, IP);

      expect(supabase.createUser).toHaveBeenCalledWith('ada@example.com', expect.any(String), 'Ada Lovelace');
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { id: USER },
        create: { id: USER, name: 'Ada Lovelace', mustChangePassword: true },
        update: { name: 'Ada Lovelace', mustChangePassword: true },
      });
      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: USER, type: 'creator' }),
      });
      expect(audit.record).toHaveBeenCalledWith(USER, 'affiliate.apply_new', 'affiliate', AFFILIATE_ID, { type: 'creator', email: 'ada@example.com' });

      expect(email.send).toHaveBeenCalledTimes(1);
      const sent = email.send.mock.calls[0][0];
      expect(sent.to).toBe('ada@example.com');
      expect(sent.html).toContain('ada@example.com');
      expect(sent.html).toContain('AIIT-AFF-ABC123');
    });
  });

  describe('activate', () => {
    it('404s for an account with no affiliate application', async () => {
      prisma.affiliate.findUnique.mockResolvedValue(null);
      await expect(service.activate(USER, 'AIIT-AFF-ABC123')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a reference code that does not match', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: null });
      await expect(service.activate(USER, 'wrong-code')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.affiliate.update).not.toHaveBeenCalled();
    });

    it('is case-insensitive and trims whitespace, then stamps activatedAt', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: null, applicationStatus: 'approved', referralSlug: 'xyz' });
      prisma.affiliate.update.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: new Date(), applicationStatus: 'approved', referralSlug: 'xyz' });
      prisma.profile.count.mockResolvedValue(0);

      const result = await service.activate(USER, '  aiit-aff-abc123  ');

      expect(prisma.affiliate.update).toHaveBeenCalledWith({ where: { userId: USER }, data: { activatedAt: expect.any(Date) } });
      expect(result.activated).toBe(true);
      expect(result.referralLink).toBe('https://aiit.network/r/xyz');
    });

    it('is a no-op (not an error) if already activated', async () => {
      const row = { id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: new Date(), applicationStatus: 'approved', referralSlug: 'xyz' };
      prisma.affiliate.findUnique.mockResolvedValue(row);
      prisma.profile.count.mockResolvedValue(0);

      await service.activate(USER, 'does-not-matter');

      expect(prisma.affiliate.update).not.toHaveBeenCalled();
    });
  });
});
