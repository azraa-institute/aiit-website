import { ConflictException, NotFoundException } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';

const USER = '11111111-1111-4111-8111-111111111111';
const AFFILIATE_ID = '22222222-2222-4222-8222-222222222222';
const IP = '203.0.113.7';

describe('AffiliatesService', () => {
  let service: AffiliatesService;
  let prisma: {
    affiliate: { create: jest.Mock; findUnique: jest.Mock };
    profile: { count: jest.Mock };
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      affiliate: { create: jest.fn(), findUnique: jest.fn() },
      profile: { count: jest.fn() },
    };
    audit = { record: jest.fn() };
    service = new AffiliatesService(prisma as never, audit as never);
  });

  it('creates a pending application, capturing the signature, and audits it', async () => {
    prisma.affiliate.create.mockResolvedValue({
      id: AFFILIATE_ID,
      userId: USER,
      type: 'creator',
      applicationStatus: 'pending',
      referralSlug: 'abc123',
      rejectionReason: null,
    });

    const result = await service.apply(USER, 'creator', '  Ada Lovelace  ', IP);

    expect(result).toEqual(
      expect.objectContaining({ hasApplied: true, type: 'creator', applicationStatus: 'pending', referralLink: null, registrationCount: null }),
    );
    expect(prisma.affiliate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signedName: 'Ada Lovelace',
        signedIp: IP,
        agreementVersion: AFFILIATE_AGREEMENT_VERSION,
        signedAt: expect.any(Date),
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
      rejectionReason: null,
    });

    const result = await service.me(USER);

    expect(result.referralLink).toBeNull();
    expect(result.registrationCount).toBeNull();
    expect(prisma.profile.count).not.toHaveBeenCalled();
  });

  it('includes the referral link and a live registration count once approved', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      type: 'affiliate_to_affiliate',
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      rejectionReason: null,
    });
    prisma.profile.count.mockResolvedValue(7);

    const result = await service.me(USER);

    expect(result.referralLink).toBe('https://aiit.network/r/abc123');
    expect(result.registrationCount).toBe(7);
    expect(prisma.profile.count).toHaveBeenCalledWith({ where: { referredByAffiliateId: AFFILIATE_ID } });
  });
});
