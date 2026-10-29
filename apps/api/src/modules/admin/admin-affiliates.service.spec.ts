import { BadRequestException } from '@nestjs/common';
import { AdminAffiliatesService } from './admin-affiliates.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const APPLICANT = '22222222-2222-4222-8222-222222222222';
const AFFILIATE = '33333333-3333-4333-8333-333333333333';

describe('AdminAffiliatesService', () => {
  let service: AdminAffiliatesService;
  let prisma: {
    affiliate: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock; groupBy: jest.Mock; count: jest.Mock };
    affiliatePayout: { findMany: jest.Mock; aggregate: jest.Mock; create: jest.Mock };
    profile: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
    notification: { create: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let email: { send: jest.Mock };
  let affiliatesService: { createManually: jest.Mock };
  let supabase: { setPassword: jest.Mock };

  const row = (status = 'pending') => ({
    id: AFFILIATE,
    userId: APPLICANT,
    types: ['creator'],
    applicationStatus: status,
    referralSlug: 'abc123',
    referenceCode: 'AIIT-AFF-ABC123',
    activatedAt: null,
    referredByAffiliateId: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    prisma = {
      affiliate: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      affiliatePayout: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: null } }),
        create: jest.fn(),
      },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: APPLICANT, name: 'Ada' }]), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ id: APPLICANT, email: 'ada@example.com' }]),
    };
    audit = { record: jest.fn() };
    email = { send: jest.fn() };
    affiliatesService = { createManually: jest.fn() };
    supabase = { setPassword: jest.fn().mockResolvedValue(undefined) };
    service = new AdminAffiliatesService(prisma as never, audit as never, email as never, affiliatesService as never, supabase as never);
  });

  it('createManually() delegates to AffiliatesService and returns the resulting detail + temp password', async () => {
    affiliatesService.createManually.mockResolvedValue({ affiliate: row(), temporaryPassword: 'Abc123!xyz' });
    prisma.affiliate.findUnique.mockResolvedValue(row());

    const result = await service.createManually(ADMIN, { name: 'Ada', email: 'ada@example.com', types: ['creator'] } as never, '203.0.113.1');

    expect(affiliatesService.createManually).toHaveBeenCalledWith(ADMIN, { name: 'Ada', email: 'ada@example.com', types: ['creator'] }, '203.0.113.1');
    expect(result.temporaryPassword).toBe('Abc123!xyz');
    expect(result.affiliate.id).toBe(AFFILIATE);
    expect(result.affiliate.types).toEqual(['creator']);
  });

  it('rejecting without a reason is blocked', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(row());
    await expect(service.setStatus(ADMIN, AFFILIATE, 'rejected')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.affiliate.update).not.toHaveBeenCalled();
  });

  it('approving notifies and emails the applicant, and audits the transition', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(row('in_review'));
    await service.setStatus(ADMIN, AFFILIATE, 'approved');

    expect(prisma.affiliate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ applicationStatus: 'approved', reviewedBy: ADMIN }) }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: APPLICANT, href: '/affiliate-portal' }) }),
    );
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }));
    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'affiliate.status', 'affiliate', AFFILIATE, { from: 'in_review', to: 'approved' });

    // Approval is the only moment a public applicant actually gets working
    // login credentials -- see AffiliatesService.applyNew()'s doc comment.
    // A fresh password is set server-side (the original was never persisted)
    // and the email body contains it, not just a generic "you're approved".
    expect(supabase.setPassword).toHaveBeenCalledWith(APPLICANT, expect.any(String));
    const sentHtml = email.send.mock.calls[0][0].html as string;
    expect(sentHtml).toContain('Temporary password');
    expect(sentHtml).toContain('AIIT-AFF-ABC123');
  });

  it('rejecting does not set a new password or send credentials', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(row('pending'));
    await service.setStatus(ADMIN, AFFILIATE, 'rejected', 'Incomplete profile information.');

    expect(supabase.setPassword).not.toHaveBeenCalled();
    const sentHtml = email.send.mock.calls[0][0].html as string;
    expect(sentHtml).not.toContain('Temporary password');
  });

  it('a no-op status (same as current) skips the notification', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(row('pending'));
    await service.setStatus(ADMIN, AFFILIATE, 'in_review');

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('rejecting with a reason notifies, emails, and records the reason', async () => {
    prisma.affiliate.findUnique.mockResolvedValue(row('pending'));
    await service.setStatus(ADMIN, AFFILIATE, 'rejected', 'Incomplete profile information.');

    expect(prisma.affiliate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ applicationStatus: 'rejected', rejectionReason: 'Incomplete profile information.' }) }),
    );
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(email.send).toHaveBeenCalled();
  });

  it('stats combines per-status counts with a total and a live registration count', async () => {
    prisma.affiliate.groupBy.mockResolvedValue([
      { applicationStatus: 'pending', _count: { _all: 3 } },
      { applicationStatus: 'approved', _count: { _all: 2 } },
    ]);
    prisma.profile.count.mockResolvedValue(17);

    await expect(service.stats()).resolves.toEqual({
      total: 5,
      pending: 3,
      inReview: 0,
      approved: 2,
      rejected: 0,
      totalRegistrations: 17,
    });
    expect(prisma.profile.count).toHaveBeenCalledWith({ where: { referredByAffiliateId: { not: null } } });
  });

  describe('detail', () => {
    it('surfaces the referral link/coupon only once approved and activated, plus the reference code regardless', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ ...row('approved'), activatedAt: null });

      const detail = await service.detail(AFFILIATE);

      expect(detail.referralLink).toBeNull();
      expect(detail.affiliateCouponCode).toBeNull();
      expect(detail.referenceCode).toBe('AIIT-AFF-ABC123');
      expect(detail.activatedAt).toBeNull();
    });

    it('surfaces the referral link once approved and activated, labeled for the held type', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ ...row('approved'), types: ['student'], activatedAt: new Date() });

      const detail = await service.detail(AFFILIATE);

      expect(detail.referralLink).toBe('https://aiit.network/r/abc123');
      expect(detail.studentReferralLinkLabel).toBe('Direct Student Referral Link');
      expect(detail.affiliateCouponCode).toBeNull();
    });

    it('resolves referredBy into a displayable name/email for an affiliate-to-affiliate chain', async () => {
      const REFERRER = '55555555-5555-4555-8555-555555555555';
      prisma.affiliate.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id === AFFILIATE ? { ...row('approved'), referredByAffiliateId: REFERRER } : { id: REFERRER, userId: APPLICANT }),
      );
      prisma.$queryRaw.mockResolvedValue([{ id: APPLICANT, email: 'ref@example.com' }]);
      prisma.profile.findMany.mockResolvedValue([{ id: APPLICANT, name: 'Referrer Name' }]);

      const detail = await service.detail(AFFILIATE);

      expect(detail.referredBy).toEqual({ id: REFERRER, name: 'Referrer Name', email: 'ref@example.com' });
    });

    it('breaks earnings down by pool, only including a pool the affiliate holds a type for', async () => {
      prisma.affiliate.findUnique.mockResolvedValue({ ...row('approved'), types: ['affiliate_to_affiliate'] });
      prisma.affiliate.count.mockResolvedValue(4);
      prisma.$queryRaw.mockImplementation((q: unknown) =>
        Promise.resolve(String(q).includes('affiliates a2') ? [{ count: 4n }] : [{ id: APPLICANT, email: 'ada@example.com' }]),
      );

      const detail = await service.detail(AFFILIATE);

      expect(detail.earnings.studentReferrals).toBeNull();
      expect(detail.earnings.affiliateReferrals).toEqual({ totalCount: 4, eligibleCount: 4, estimatedCents: 1000 });
      expect(detail.earnings.estimatedCents).toBe(1000);
    });
  });

  describe('list', () => {
    it('filters by "has this type" rather than equality, since one affiliate can hold several', async () => {
      await service.list({ type: 'affiliate_to_affiliate' });

      expect(prisma.affiliate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ types: { has: 'affiliate_to_affiliate' } }) }),
      );
    });
  });

  describe('recordPayout', () => {
    it('creates a ledger entry and returns the refreshed detail', async () => {
      prisma.affiliate.findUnique.mockResolvedValue(row('approved'));

      await service.recordPayout(ADMIN, AFFILIATE, 7000, 'October payout');

      expect(prisma.affiliatePayout.create).toHaveBeenCalledWith({
        data: { affiliateId: AFFILIATE, amountCents: 7000, note: 'October payout', recordedBy: ADMIN },
      });
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'affiliate.payout_recorded', 'affiliate', AFFILIATE, { amountCents: 7000 });
    });

    it('rejects a zero or negative amount', async () => {
      prisma.affiliate.findUnique.mockResolvedValue(row('approved'));
      await expect(service.recordPayout(ADMIN, AFFILIATE, 0, undefined)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.affiliatePayout.create).not.toHaveBeenCalled();
    });
  });
});
