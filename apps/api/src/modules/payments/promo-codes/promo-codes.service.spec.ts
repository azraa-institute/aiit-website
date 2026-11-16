import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PromoCodesService } from './promo-codes.service';

const PROMO_CODE = {
  id: 'promo-1',
  code: 'mba2027',
  courseIds: ['course-1', 'course-2', 'course-3'],
  singlePriceCents: 1100000,
  bundlePriceCents: 700000,
  currency: 'INR',
  maxRedemptions: 300,
  active: true,
  createdByAdminId: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let prisma: {
    promoCode: { create: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
    order: { groupBy: jest.Mock };
    course: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      promoCode: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      order: { groupBy: jest.fn() },
      course: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PromoCodesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PromoCodesService);
  });

  describe('generateCode', () => {
    it('lowercases a given code and stores it', async () => {
      prisma.promoCode.create.mockResolvedValueOnce(PROMO_CODE);
      await service.generateCode('admin-1', {
        code: 'MBA2027',
        courseIds: ['course-1', 'course-2', 'course-3'],
        singlePriceCents: 1100000,
        bundlePriceCents: 700000,
        maxRedemptions: 300,
      });
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'mba2027', createdByAdminId: 'admin-1' }),
      });
    });

    it('auto-generates a code when none is given', async () => {
      prisma.promoCode.create.mockResolvedValueOnce(PROMO_CODE);
      await service.generateCode('admin-1', { courseIds: ['course-1'], singlePriceCents: 100, bundlePriceCents: 100, maxRedemptions: 1 });
      const data = prisma.promoCode.create.mock.calls[0][0].data;
      expect(data.code).toMatch(/^mba-[0-9a-f]{6}$/);
    });

    it('maps a P2002 collision to a friendly ConflictException', async () => {
      prisma.promoCode.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(
        service.generateCode('admin-1', { code: 'mba2027', courseIds: ['course-1'], singlePriceCents: 100, bundlePriceCents: 100, maxRedemptions: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a redemption cap of zero', async () => {
      await expect(
        service.generateCode('admin-1', { courseIds: ['course-1'], singlePriceCents: 100, bundlePriceCents: 100, maxRedemptions: 0 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('redemptionCount', () => {
    it('counts distinct providerRefs, not raw Order rows -- a 3-course bundle checkout is one redemption', async () => {
      prisma.order.groupBy.mockResolvedValueOnce([{ providerRef: 'RZP-1', _count: { _all: 3 } }]);
      const count = await service.redemptionCount('promo-1');
      expect(count).toBe(1);
      expect(prisma.order.groupBy).toHaveBeenCalledWith({
        by: ['providerRef'],
        where: { promoCodeId: 'promo-1', status: 'paid' },
        _count: { _all: true },
      });
    });
  });

  describe('priceCart', () => {
    const convert = jest.fn(async (usdCents: number) => usdCents * 2);

    beforeEach(() => {
      convert.mockClear();
      prisma.course.findMany.mockResolvedValue([
        { id: 'course-1', priceUsdCents: 15000 },
        { id: 'course-2', priceUsdCents: 15000 },
        { id: 'course-3', priceUsdCents: 15000 },
        { id: 'some-other-course', priceUsdCents: 10000 },
      ]);
    });

    it('prices every course via convert when no promo code is given', async () => {
      const result = await service.priceCart(['course-1', 'some-other-course'], undefined, 'INR', convert);
      expect(result.promoCodeId).toBeNull();
      expect(result.lines).toEqual([
        { courseId: 'course-1', amountCents: 30000, eligible: false },
        { courseId: 'some-other-course', amountCents: 20000, eligible: false },
      ]);
      expect(result.totalAmountCents).toBe(50000);
      expect(prisma.promoCode.findFirst).not.toHaveBeenCalled();
    });

    it('throws for a missing/inactive code without revealing why', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(null);
      await expect(service.priceCart(['course-1'], 'nope', 'INR', convert)).rejects.toThrow(BadRequestException);
    });

    it('throws when the code matches nothing in the cart', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      await expect(service.priceCart(['some-other-course'], 'mba2027', 'INR', convert)).rejects.toThrow(BadRequestException);
    });

    it('throws when the redemption cap has been reached', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce({ ...PROMO_CODE, maxRedemptions: 1 });
      prisma.order.groupBy.mockResolvedValueOnce([{ providerRef: 'RZP-1', _count: { _all: 1 } }]);
      await expect(service.priceCart(['course-1'], 'mba2027', 'INR', convert)).rejects.toThrow(ConflictException);
    });

    it('prices 1 or 2 of 3 scoped courses at the single rate', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      const result = await service.priceCart(['course-1', 'course-2'], 'MBA2027', 'INR', convert);
      expect(result.promoCodeId).toBe('promo-1');
      expect(result.lines).toEqual([
        { courseId: 'course-1', amountCents: 1100000, eligible: true },
        { courseId: 'course-2', amountCents: 1100000, eligible: true },
      ]);
      expect(result.totalAmountCents).toBe(2200000);
    });

    it('prices all 3 scoped courses at the bundle rate', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      const result = await service.priceCart(['course-1', 'course-2', 'course-3'], 'mba2027', 'INR', convert);
      expect(result.lines.every((l) => l.amountCents === 700000 && l.eligible)).toBe(true);
      expect(result.totalAmountCents).toBe(2100000);
    });

    it('mixes eligible (code rate) and ineligible (converted rate) lines in one cart, and sets promoCodeId only because something was eligible', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      const result = await service.priceCart(['course-1', 'some-other-course'], 'mba2027', 'INR', convert);
      expect(result.promoCodeId).toBe('promo-1');
      expect(result.lines).toEqual([
        { courseId: 'course-1', amountCents: 1100000, eligible: true },
        { courseId: 'some-other-course', amountCents: 20000, eligible: false },
      ]);
      expect(convert).toHaveBeenCalledWith(10000);
      expect(convert).not.toHaveBeenCalledWith(15000);
    });
  });

  describe('resolveCourseIds', () => {
    it('throws if a slug does not resolve to a published, paid course', async () => {
      prisma.course.findMany.mockResolvedValueOnce([{ id: 'course-1', slug: 'ai-markets' }]);
      await expect(service.resolveCourseIds(['ai-markets', 'does-not-exist'])).rejects.toThrow(BadRequestException);
    });

    it('resolves every valid slug to its course id', async () => {
      prisma.course.findMany.mockResolvedValueOnce([
        { id: 'course-1', slug: 'ai-markets' },
        { id: 'course-2', slug: 'zoho-crm' },
      ]);
      const ids = await service.resolveCourseIds(['ai-markets', 'zoho-crm']);
      expect(ids).toEqual(['course-1', 'course-2']);
    });
  });
});
