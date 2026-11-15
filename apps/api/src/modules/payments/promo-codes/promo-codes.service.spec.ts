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

  describe('priceCheckout', () => {
    it('throws for a missing/inactive code without revealing why', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(null);
      await expect(service.priceCheckout('nope', ['course-1'])).rejects.toThrow(BadRequestException);
    });

    it('throws when a course falls outside the code scope', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      await expect(service.priceCheckout('mba2027', ['course-1', 'some-other-course'])).rejects.toThrow(BadRequestException);
    });

    it('throws when the redemption cap has been reached', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce({ ...PROMO_CODE, maxRedemptions: 1 });
      prisma.order.groupBy.mockResolvedValueOnce([{ providerRef: 'RZP-1', _count: { _all: 1 } }]);
      await expect(service.priceCheckout('mba2027', ['course-1'])).rejects.toThrow(ConflictException);
    });

    it('prices 1 or 2 of 3 scoped courses at the single rate', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      const result = await service.priceCheckout('MBA2027', ['course-1', 'course-2']);
      expect(result).toEqual({ promoCodeId: 'promo-1', pricePerCourseCents: 1100000, totalAmountCents: 2200000, currency: 'INR' });
    });

    it('prices all 3 scoped courses at the bundle rate', async () => {
      prisma.promoCode.findFirst.mockResolvedValueOnce(PROMO_CODE);
      prisma.order.groupBy.mockResolvedValueOnce([]);
      const result = await service.priceCheckout('mba2027', ['course-1', 'course-2', 'course-3']);
      expect(result).toEqual({ promoCodeId: 'promo-1', pricePerCourseCents: 700000, totalAmountCents: 2100000, currency: 'INR' });
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
