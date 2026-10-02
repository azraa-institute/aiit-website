import { BadRequestException } from '@nestjs/common';
import { AdminAffiliatesService } from './admin-affiliates.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const APPLICANT = '22222222-2222-4222-8222-222222222222';
const AFFILIATE = '33333333-3333-4333-8333-333333333333';

describe('AdminAffiliatesService', () => {
  let service: AdminAffiliatesService;
  let prisma: {
    affiliate: { findUnique: jest.Mock; update: jest.Mock };
    profile: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
    notification: { create: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let email: { send: jest.Mock };

  const row = (status = 'pending') => ({
    id: AFFILIATE,
    userId: APPLICANT,
    type: 'creator',
    applicationStatus: status,
    referralSlug: 'abc123',
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    prisma = {
      affiliate: { findUnique: jest.fn(), update: jest.fn() },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: APPLICANT, name: 'Ada' }]), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ id: APPLICANT, email: 'ada@example.com' }]),
    };
    audit = { record: jest.fn() };
    email = { send: jest.fn() };
    service = new AdminAffiliatesService(prisma as never, audit as never, email as never);
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
});
