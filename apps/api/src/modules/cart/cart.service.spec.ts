import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { CartService } from './cart.service';

const COURSE = { id: 'course-1', pricing: 'paid', image: '/img.jpg', title: 'Full Stack Development', slug: 'full-stack-development', priceUsdCents: 4900 };

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cartItem: { findMany: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
    course: { findFirst: jest.Mock };
    enrollment: { findUnique: jest.Mock };
  };
  let currency: { resolveCurrency: jest.Mock; convert: jest.Mock };

  beforeEach(async () => {
    prisma = {
      cartItem: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'cart-item-1' }), deleteMany: jest.fn() },
      course: { findFirst: jest.fn() },
      enrollment: { findUnique: jest.fn() },
    };
    currency = { resolveCurrency: jest.fn().mockReturnValue('USD'), convert: jest.fn().mockResolvedValue({ currency: 'USD', amountCents: 4900 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: prisma }, { provide: CurrencyService, useValue: currency }],
    }).compile();

    service = moduleRef.get(CartService);
  });

  describe('list', () => {
    it('resolves display currency and converts each course price', async () => {
      prisma.cartItem.findMany.mockResolvedValueOnce([{ course: COURSE }]);

      const result = await service.list('user-1', { headers: {} });

      expect(result).toEqual([{ courseId: 'course-1', slug: 'full-stack-development', title: 'Full Stack Development', image: '/img.jpg', amountCents: 4900, currency: 'USD' }]);
    });

    it('passes a null amount through for a members-only course with no price', async () => {
      prisma.cartItem.findMany.mockResolvedValueOnce([{ course: { ...COURSE, priceUsdCents: null } }]);

      const result = await service.list('user-1', { headers: {} });

      expect(result[0].amountCents).toBeNull();
      expect(currency.convert).not.toHaveBeenCalled();
    });
  });

  describe('add', () => {
    it('throws NotFoundException for a missing/unpublished course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.add('user-1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('rejects a free/subscription course -- nothing to cash out', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ ...COURSE, pricing: 'free' });
      await expect(service.add('user-1', 'free-course')).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the learner already holds an active or completed enrollment', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE);
      prisma.enrollment.findUnique.mockResolvedValueOnce({ status: 'active' });
      await expect(service.add('user-1', 'full-stack-development')).rejects.toThrow(ConflictException);
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('allows adding a course the learner previously cancelled out of', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE);
      prisma.enrollment.findUnique.mockResolvedValueOnce({ status: 'cancelled' });
      await service.add('user-1', 'full-stack-development');
      expect(prisma.cartItem.create).toHaveBeenCalledWith({ data: { userId: 'user-1', courseId: 'course-1' } });
    });

    it('maps a P2002 collision (already in cart) to a friendly ConflictException', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE);
      prisma.enrollment.findUnique.mockResolvedValueOnce(null);
      prisma.cartItem.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(service.add('user-1', 'full-stack-development')).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when nothing was removed', async () => {
      prisma.cartItem.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.remove('user-1', 'course-1')).rejects.toThrow(NotFoundException);
    });

    it('removes the matching cart item', async () => {
      prisma.cartItem.deleteMany.mockResolvedValueOnce({ count: 1 });
      await service.remove('user-1', 'course-1');
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', courseId: 'course-1' } });
    });
  });
});
