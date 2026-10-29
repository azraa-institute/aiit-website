import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';
import type { ApplyNewAffiliateDto } from './dto/apply-new-affiliate.dto';

const USER = '11111111-1111-4111-8111-111111111111';
const AFFILIATE_ID = '22222222-2222-4222-8222-222222222222';
const REFERRER_ID = '33333333-3333-4333-8333-333333333333';
const IP = '203.0.113.7';

describe('AffiliatesService', () => {
  let service: AffiliatesService;
  let prisma: {
    affiliate: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    affiliatePayout: { aggregate: jest.Mock; findMany: jest.Mock };
    profile: { count: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let email: { send: jest.Mock };
  let supabase: { createUser: jest.Mock };
  let youtube: { fetchSubscriberCount: jest.Mock };
  let brevo: { upsertContact: jest.Mock };

  beforeEach(() => {
    prisma = {
      affiliate: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      affiliatePayout: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: null } }), findMany: jest.fn().mockResolvedValue([]) },
      profile: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
      // Default: countOnboardedReferrals()/countSuccessfulAffiliateReferrals() both see 0 unless a test overrides.
      $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
    };
    audit = { record: jest.fn() };
    email = { send: jest.fn().mockResolvedValue(undefined) };
    supabase = { createUser: jest.fn() };
    youtube = { fetchSubscriberCount: jest.fn().mockResolvedValue(null) };
    brevo = { upsertContact: jest.fn().mockResolvedValue(undefined) };
    service = new AffiliatesService(prisma as never, audit as never, email as never, supabase as never, youtube as never, brevo as never);
  });

  it('creates a pending application, capturing the signature, and audits it', async () => {
    prisma.affiliate.create.mockResolvedValue({
      id: AFFILIATE_ID,
      userId: USER,
      types: ['creator'],
      applicationStatus: 'pending',
      referralSlug: 'abc123',
      referenceCode: 'AIIT-AFF-ABC123',
      activatedAt: null,
      rejectionReason: null,
    });

    const result = await service.apply(USER, ['creator'], '  Ada Lovelace  ', IP);

    expect(result).toEqual(
      expect.objectContaining({ hasApplied: true, types: ['creator'], applicationStatus: 'pending', activated: false, referralLink: null, registrationCount: null }),
    );
    expect(prisma.affiliate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        types: ['creator'],
        signedName: 'Ada Lovelace',
        signedIp: IP,
        agreementVersion: AFFILIATE_AGREEMENT_VERSION,
        signedAt: expect.any(Date),
        referenceCode: expect.stringMatching(/^AIIT-AFF-[0-9A-F]{6}$/),
        referredByAffiliateId: null,
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(USER, 'affiliate.apply', 'affiliate', AFFILIATE_ID, { types: ['creator'] });
  });

  it('rejects an application with no types selected', async () => {
    await expect(service.apply(USER, [], 'Ada Lovelace', IP)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.affiliate.create).not.toHaveBeenCalled();
  });

  it('resolves a valid affiliate coupon code into referredByAffiliateId', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({ id: REFERRER_ID, referralSlug: 'coolcode' });
    prisma.affiliate.create.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, types: ['student'] });

    await service.apply(USER, ['student'], 'Ada Lovelace', IP, {}, '  CoolCode  ');

    expect(prisma.affiliate.findUnique).toHaveBeenCalledWith({ where: { referralSlug: 'coolcode' } });
    expect(prisma.affiliate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ referredByAffiliateId: REFERRER_ID }),
    });
  });

  it('rejects an application with a coupon code that matches no affiliate', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(null);
    await expect(service.apply(USER, ['student'], 'Ada Lovelace', IP, {}, 'no-such-code')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.affiliate.create).not.toHaveBeenCalled();
  });

  it('turns a duplicate application (unique-index conflict) into a ConflictException', async () => {
    prisma.affiliate.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.apply(USER, ['student'], 'Grace Hopper', IP)).rejects.toBeInstanceOf(ConflictException);
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
      types: [],
      applicationStatus: null,
      rejectionReason: null,
      activated: false,
      referralLink: null,
      studentReferralLinkLabel: null,
      affiliateCouponCode: null,
      registrationCount: null,
      affiliateReferralCount: null,
      earnings: null,
      payoutDetails: null,
      payouts: [],
      phone: null,
      handle: null,
      country: null,
      state: null,
      city: null,
      motivation: null,
      socialLinks: [],
    });
  });

  it('withholds the referral link and counts until the application is approved', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      types: ['student'],
      applicationStatus: 'in_review',
      referralSlug: 'abc123',
      activatedAt: null,
      rejectionReason: null,
    });

    const result = await service.me(USER);

    expect(result.referralLink).toBeNull();
    expect(result.registrationCount).toBeNull();
    expect(result.affiliateReferralCount).toBeNull();
    expect(result.earnings).toBeNull();
    expect(prisma.profile.count).not.toHaveBeenCalled();
  });

  it('withholds the referral link even once approved, until the reference code is activated', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      types: ['student'],
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: null,
      rejectionReason: null,
    });
    prisma.profile.count.mockResolvedValue(7);

    const result = await service.me(USER);

    expect(result.activated).toBe(false);
    expect(result.referralLink).toBeNull();
    expect(result.studentReferralLinkLabel).toBeNull();
    // Registration count and earnings are still shown once approved, independent of activation.
    expect(result.registrationCount).toBe(7);
    expect(result.earnings).not.toBeNull();
  });

  it('includes the referral link, labeled for a direct student referrer, once approved AND activated', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      types: ['student'],
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: new Date(),
      rejectionReason: null,
    });
    prisma.profile.count.mockResolvedValue(7);

    const result = await service.me(USER);

    expect(result.activated).toBe(true);
    expect(result.referralLink).toBe('https://aiit.network/r/abc123');
    expect(result.studentReferralLinkLabel).toBe('Direct Student Referral Link');
    expect(result.affiliateCouponCode).toBeNull();
    expect(result.registrationCount).toBe(7);
    expect(prisma.profile.count).toHaveBeenCalledWith({ where: { referredByAffiliateId: AFFILIATE_ID } });
  });

  it('includes the coupon code, not a referral link, for an affiliate-to-affiliate-only affiliate', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      types: ['affiliate_to_affiliate'],
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: new Date(),
      rejectionReason: null,
    });
    prisma.affiliate.count.mockResolvedValue(3);

    const result = await service.me(USER);

    expect(result.referralLink).toBeNull();
    expect(result.studentReferralLinkLabel).toBeNull();
    expect(result.affiliateCouponCode).toBe('ABC123');
    expect(result.affiliateReferralCount).toBe(3);
  });

  it('labels the shared link for a direct referrer even when creator is also held', async () => {
    prisma.affiliate.findUnique.mockResolvedValue({
      id: AFFILIATE_ID,
      types: ['student', 'creator'],
      applicationStatus: 'approved',
      referralSlug: 'abc123',
      activatedAt: new Date(),
      rejectionReason: null,
    });

    const result = await service.me(USER);

    expect(result.studentReferralLinkLabel).toBe('Direct Student Referral Link');
  });

  describe('earnings', () => {
    it('is flat $5 per onboarded referral for a creator-introduced affiliate', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['creator'],
        applicationStatus: 'approved',
        referralSlug: 'abc123',
        activatedAt: new Date(),
        rejectionReason: null,
      });
      prisma.profile.count.mockResolvedValue(20); // raw signups -- not what earnings is based on
      prisma.$queryRaw.mockResolvedValue([{ count: 10n }]); // onboarded (paid) subset
      prisma.affiliatePayout.aggregate.mockResolvedValue({ _sum: { amountCents: 2000 } });

      const result = await service.me(USER);

      expect(result.earnings).toEqual({
        studentReferrals: { totalCount: 20, eligibleCount: 10, estimatedCents: 5000 },
        affiliateReferrals: null,
        estimatedCents: 5000,
        paidCents: 2000,
        owedCents: 3000,
        currency: 'USD',
      });
    });

    it('is tiered for a direct student referrer -- $7 up to 500 onboarded, $10 past it', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['student'],
        applicationStatus: 'approved',
        referralSlug: 'abc123',
        activatedAt: new Date(),
        rejectionReason: null,
      });
      prisma.profile.count.mockResolvedValue(510);
      prisma.$queryRaw.mockResolvedValue([{ count: 510n }]);
      prisma.affiliatePayout.aggregate.mockResolvedValue({ _sum: { amountCents: null } });

      const result = await service.me(USER);

      // 500 * $7 + 10 * $10 = $3600
      expect(result.earnings?.studentReferrals).toEqual({ totalCount: 510, eligibleCount: 510, estimatedCents: 360_000 });
      expect(result.earnings?.estimatedCents).toBe(360_000);
    });

    it('is a flat $2.50 per successful affiliate-to-affiliate referral, with no milestone even past 500', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['affiliate_to_affiliate'],
        applicationStatus: 'approved',
        referralSlug: 'abc123',
        activatedAt: new Date(),
        rejectionReason: null,
      });
      prisma.affiliate.count.mockResolvedValue(600); // raw affiliate-referrals
      prisma.$queryRaw.mockResolvedValue([{ count: 600n }]); // all 600 successful

      const result = await service.me(USER);

      // Flat $2.50 regardless of volume -- NOT the $5->$10 direct-referral shape.
      expect(result.earnings?.affiliateReferrals).toEqual({ totalCount: 600, eligibleCount: 600, estimatedCents: 150_000 });
      expect(result.earnings?.studentReferrals).toBeNull();
    });

    it('does not count a referral that has not paid for a course, even though they registered', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['student'],
        applicationStatus: 'approved',
        referralSlug: 'abc123',
        activatedAt: new Date(),
        rejectionReason: null,
      });
      prisma.profile.count.mockResolvedValue(10); // 10 signed up
      prisma.$queryRaw.mockResolvedValue([{ count: 0n }]); // none of them have paid yet

      const result = await service.me(USER);

      expect(result.earnings?.studentReferrals).toEqual({ totalCount: 10, eligibleCount: 0, estimatedCents: 0 });
    });

    it('sums both pools for an affiliate holding both a student-facing type and affiliate-to-affiliate', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['student', 'affiliate_to_affiliate'],
        applicationStatus: 'approved',
        referralSlug: 'abc123',
        activatedAt: new Date(),
        rejectionReason: null,
      });
      prisma.profile.count.mockResolvedValue(5);
      prisma.affiliate.count.mockResolvedValue(2);
      // First $queryRaw call is countOnboardedReferrals (student pool), second is countSuccessfulAffiliateReferrals.
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 5n }]).mockResolvedValueOnce([{ count: 2n }]);

      const result = await service.me(USER);

      // student: 5 * $7 = $35; affiliate: 2 * $2.50 = $5; total $40.
      expect(result.earnings?.studentReferrals?.estimatedCents).toBe(3500);
      expect(result.earnings?.affiliateReferrals?.estimatedCents).toBe(500);
      expect(result.earnings?.estimatedCents).toBe(4000);
    });
  });

  describe('updatePayoutDetails', () => {
    it('saves PayPal details and clears bank fields', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ id: AFFILIATE_ID, userId: USER });
      prisma.affiliate.update.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['student'],
        applicationStatus: 'pending',
        referralSlug: 'abc123',
        activatedAt: null,
        rejectionReason: null,
        payoutMethod: 'paypal',
        payoutPaypalEmail: 'ada@example.com',
        payoutUpdatedAt: new Date('2026-10-14T12:00:00.000Z'),
      });

      const result = await service.updatePayoutDetails(USER, { method: 'paypal', paypalEmail: 'ada@example.com' }, IP);

      expect(prisma.affiliate.update).toHaveBeenCalledWith({
        where: { userId: USER },
        data: expect.objectContaining({
          payoutMethod: 'paypal',
          payoutPaypalEmail: 'ada@example.com',
          payoutBankAccountName: null,
          payoutBankAccountNumber: null,
          payoutBankName: null,
          payoutBankCode: null,
          payoutBankCountry: null,
        }),
      });
      expect(result.payoutDetails).toEqual(
        expect.objectContaining({ method: 'paypal', paypalEmail: 'ada@example.com' }),
      );
    });

    it('404s for an account with no affiliate application', async () => {
      prisma.affiliate.findUnique.mockResolvedValue(null);
      await expect(service.updatePayoutDetails(USER, { method: 'paypal', paypalEmail: 'ada@example.com' }, IP)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateContactDetails', () => {
    it('saves the edited fields, trimmed, and blanks to null', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ id: AFFILIATE_ID, userId: USER });
      prisma.affiliate.update.mockResolvedValue({
        id: AFFILIATE_ID,
        types: ['student'],
        applicationStatus: 'pending',
        referralSlug: 'abc123',
        activatedAt: null,
        rejectionReason: null,
        phone: '+2348012345678',
      });

      await service.updateContactDetails(USER, { phone: ' +2348012345678 ', handle: '', country: 'Nigeria' });

      expect(prisma.affiliate.update).toHaveBeenCalledWith({
        where: { userId: USER },
        data: {
          phone: '+2348012345678',
          handle: null,
          country: 'Nigeria',
          state: null,
          city: null,
          motivation: null,
        },
      });
    });

    it('404s for an account with no affiliate application', async () => {
      prisma.affiliate.findUnique.mockResolvedValue(null);
      await expect(service.updateContactDetails(USER, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('applyNew', () => {
    const dto: ApplyNewAffiliateDto = {
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      types: ['creator'],
      signedName: 'Ada Lovelace',
      agreedToTerms: true,
    };

    it('creates the Supabase account, upserts a learner profile flagged mustChangePassword, creates the Affiliate row, and sends only an acknowledgment email (no credentials yet)', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({
        id: AFFILIATE_ID,
        userId: USER,
        referenceCode: 'AIIT-AFF-ABC123',
      });

      await service.applyNew(dto, IP);

      expect(supabase.createUser).toHaveBeenCalledWith('ada@example.com', expect.any(String), 'Ada Lovelace', undefined, IP);
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { id: USER },
        create: { id: USER, name: 'Ada Lovelace', mustChangePassword: true },
        update: { name: 'Ada Lovelace', mustChangePassword: true },
      });
      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: USER, types: ['creator'] }),
      });
      expect(audit.record).toHaveBeenCalledWith(USER, 'affiliate.apply_new', 'affiliate', AFFILIATE_ID, { types: ['creator'], email: 'ada@example.com' });

      // Real login credentials only go out once an admin approves (see
      // AdminAffiliatesService.notifyApplicant()) -- this submission-time
      // email is acknowledgment-only, never containing the password or
      // reference code.
      expect(email.send).toHaveBeenCalledTimes(1);
      const sent = email.send.mock.calls[0][0];
      expect(sent.to).toBe('ada@example.com');
      expect(sent.html).not.toContain('Temporary password');
      expect(sent.html).not.toContain('AIIT-AFF-ABC123');
    });

    it('passes a pending referral slug through as Supabase user_metadata, so the handle_new_user() trigger can attribute the profile', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({
        id: AFFILIATE_ID,
        userId: USER,
        referenceCode: 'AIIT-AFF-ABC123',
      });

      await service.applyNew({ ...dto, referralSlug: 'abc123' }, IP);

      expect(supabase.createUser).toHaveBeenCalledWith('ada@example.com', expect.any(String), 'Ada Lovelace', {
        referral_slug: 'abc123',
      }, IP);
    });

    it('resolves an affiliate coupon code (distinct from the student referral slug) into referredByAffiliateId', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.findUnique.mockResolvedValue({ id: REFERRER_ID, referralSlug: 'recruitme' });
      prisma.affiliate.create.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123' });

      await service.applyNew({ ...dto, affiliateCouponCode: 'RecruitMe' }, IP);

      expect(prisma.affiliate.findUnique).toHaveBeenCalledWith({ where: { referralSlug: 'recruitme' } });
      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ referredByAffiliateId: REFERRER_ID }),
      });
    });
  });

  describe('createManually', () => {
    const ADMIN = '44444444-4444-4444-8444-444444444444';

    it('creates the account and an approved row (default), without fabricating e-signature evidence', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123' });

      const result = await service.createManually(ADMIN, { name: 'Ada Lovelace', email: 'Ada@Example.com', types: ['creator'] }, IP);

      expect(supabase.createUser).toHaveBeenCalledWith('ada@example.com', expect.any(String), 'Ada Lovelace', undefined, IP);
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { id: USER },
        create: { id: USER, name: 'Ada Lovelace', mustChangePassword: true, createdBy: ADMIN },
        update: { name: 'Ada Lovelace', mustChangePassword: true },
      });
      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER,
          types: ['creator'],
          applicationStatus: 'approved',
          reviewedBy: ADMIN,
        }),
      });
      // Never claim a signature that wasn't actually captured through this form.
      const created = prisma.affiliate.create.mock.calls[0][0].data;
      expect(created.signedName).toBeUndefined();
      expect(created.agreementVersion).toBeUndefined();
      expect(created.signedAt).toBeUndefined();

      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'affiliate.create_manual', 'affiliate', AFFILIATE_ID, { types: ['creator'], email: 'ada@example.com', status: 'approved' });
      expect(result.temporaryPassword).toEqual(expect.any(String));
      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }));
    });

    it('honors an explicit pending status instead of defaulting to approved', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123' });

      await service.createManually(ADMIN, { name: 'Ada', email: 'ada@example.com', types: ['creator'], status: 'pending' }, IP);

      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ applicationStatus: 'pending', reviewedBy: null, reviewedAt: null }),
      });
    });

    it('can create an affiliate with multiple types at once', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123' });

      await service.createManually(ADMIN, { name: 'Ada', email: 'ada@example.com', types: ['student', 'affiliate_to_affiliate'] }, IP);

      expect(prisma.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ types: ['student', 'affiliate_to_affiliate'] }),
      });
    });

    it('turns a duplicate (this person already has an affiliate row) into a ConflictException', async () => {
      supabase.createUser.mockResolvedValue(USER);
      prisma.affiliate.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.createManually(ADMIN, { name: 'Ada', email: 'ada@example.com', types: ['creator'] }, IP)).rejects.toBeInstanceOf(
        ConflictException,
      );
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
      prisma.affiliate.findUnique.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: null, applicationStatus: 'approved', types: ['student'], referralSlug: 'xyz' });
      prisma.affiliate.update.mockResolvedValue({ id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: new Date(), applicationStatus: 'approved', types: ['student'], referralSlug: 'xyz' });

      const result = await service.activate(USER, '  aiit-aff-abc123  ');

      expect(prisma.affiliate.update).toHaveBeenCalledWith({ where: { userId: USER }, data: { activatedAt: expect.any(Date) } });
      expect(result.activated).toBe(true);
      expect(result.referralLink).toBe('https://aiit.network/r/xyz');
    });

    it('is a no-op (not an error) if already activated', async () => {
      const row = { id: AFFILIATE_ID, userId: USER, referenceCode: 'AIIT-AFF-ABC123', activatedAt: new Date(), applicationStatus: 'approved', types: ['student'], referralSlug: 'xyz' };
      prisma.affiliate.findUnique.mockResolvedValue(row);

      await service.activate(USER, 'does-not-matter');

      expect(prisma.affiliate.update).not.toHaveBeenCalled();
    });
  });
});
