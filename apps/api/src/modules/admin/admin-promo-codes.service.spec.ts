import { AdminPromoCodesService } from './admin-promo-codes.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const PROMO_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

const PROMO_ROW = {
  id: PROMO_ID,
  code: 'mba2027',
  courseIds: ['course-1', 'course-2', 'course-3'],
  singlePriceCents: 1100000,
  bundlePriceCents: 700000,
  currency: 'INR',
  maxRedemptions: 300,
  active: true,
  createdByAdminId: ADMIN,
  createdAt: new Date('2026-11-15T00:00:00Z'),
  updatedAt: new Date('2026-11-15T00:00:00Z'),
};

describe('AdminPromoCodesService', () => {
  let service: AdminPromoCodesService;
  let prisma: {
    promoCode: { findMany: jest.Mock; update: jest.Mock };
    course: { findMany: jest.Mock };
    order: { groupBy: jest.Mock; findMany: jest.Mock };
    profile: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let promoCodesService: { generateCode: jest.Mock; findById: jest.Mock; redemptionCount: jest.Mock };

  beforeEach(() => {
    prisma = {
      promoCode: { findMany: jest.fn().mockResolvedValue([PROMO_ROW]), update: jest.fn() },
      course: { findMany: jest.fn().mockResolvedValue([{ id: 'course-1', title: 'Applied AI for Markets & Finance' }, { id: 'course-2', title: 'Zoho CRM Professional Certification' }, { id: 'course-3', title: 'Strategic Lead Generation & Growth Marketing' }]) },
      order: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]) },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: USER_ID, name: 'Ada' }]) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: USER_ID, email: 'ada@example.com' }]),
    };
    audit = { record: jest.fn() };
    promoCodesService = { generateCode: jest.fn(), findById: jest.fn().mockResolvedValue(PROMO_ROW), redemptionCount: jest.fn().mockResolvedValue(0) };
    service = new AdminPromoCodesService(prisma as never, audit as never, promoCodesService as never);
  });

  describe('list', () => {
    it('resolves course titles and batches paid-redemption counts per code', async () => {
      prisma.order.groupBy.mockResolvedValueOnce([
        { promoCodeId: PROMO_ID, providerRef: 'RZP-1' },
        { promoCodeId: PROMO_ID, providerRef: 'RZP-2' },
      ]);

      const [summary] = await service.list();

      expect(summary.code).toBe('mba2027');
      expect(summary.courseTitles).toEqual([
        'Applied AI for Markets & Finance',
        'Zoho CRM Professional Certification',
        'Strategic Lead Generation & Growth Marketing',
      ]);
      expect(summary.paidRedemptionCount).toBe(2);
    });
  });

  describe('detail', () => {
    it('groups paid Order rows back into one redemption per distinct providerRef', async () => {
      prisma.order.findMany.mockResolvedValueOnce([
        { userId: USER_ID, providerRef: 'RZP-1', amountCents: 700000, paidAt: new Date('2026-11-16T00:00:00Z'), createdAt: new Date() },
        { userId: USER_ID, providerRef: 'RZP-1', amountCents: 700000, paidAt: new Date('2026-11-16T00:00:00Z'), createdAt: new Date() },
        { userId: USER_ID, providerRef: 'RZP-1', amountCents: 700000, paidAt: new Date('2026-11-16T00:00:00Z'), createdAt: new Date() },
      ]);

      const detail = await service.detail(PROMO_ID);

      expect(detail.redemptions).toHaveLength(1);
      expect(detail.redemptions[0]).toEqual({
        providerRef: 'RZP-1',
        userName: 'Ada',
        userEmail: 'ada@example.com',
        courseCount: 3,
        amountCents: 2100000,
        paidAt: '2026-11-16T00:00:00.000Z',
      });
      expect(detail.courseIds).toEqual(PROMO_ROW.courseIds);
    });
  });

  describe('generate', () => {
    it('delegates to PromoCodesService, audit-logs, then returns the full detail', async () => {
      promoCodesService.generateCode.mockResolvedValueOnce(PROMO_ROW);

      const result = await service.generate(ADMIN, { courseIds: PROMO_ROW.courseIds, singlePriceCents: 1100000, bundlePriceCents: 700000, maxRedemptions: 300 });

      expect(promoCodesService.generateCode).toHaveBeenCalledWith(ADMIN, expect.objectContaining({ maxRedemptions: 300 }));
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'promo_code.create', 'promo_code', PROMO_ID, expect.objectContaining({ code: 'mba2027' }));
      expect(result.code).toBe('mba2027');
    });
  });

  describe('setActive / updateCap', () => {
    it('deactivates a code and audit-logs the change', async () => {
      await service.setActive(ADMIN, PROMO_ID, false);
      expect(prisma.promoCode.update).toHaveBeenCalledWith({ where: { id: PROMO_ID }, data: { active: false } });
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'promo_code.update', 'promo_code', PROMO_ID, { active: false });
    });

    it('raises the redemption cap and audit-logs the change', async () => {
      await service.updateCap(ADMIN, PROMO_ID, 500);
      expect(prisma.promoCode.update).toHaveBeenCalledWith({ where: { id: PROMO_ID }, data: { maxRedemptions: 500 } });
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'promo_code.update', 'promo_code', PROMO_ID, { maxRedemptions: 500 });
    });
  });
});
