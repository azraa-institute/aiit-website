import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { PaymentsService } from './payments.service';

const COURSE = { id: 'course-1', title: 'Full Stack Development', pricing: 'paid', priceUsdCents: 4900 };

const ORDER = {
  id: 'order-1',
  userId: 'user-1',
  courseId: 'course-1',
  provider: 'paypal',
  providerRef: 'PAYPAL-ORDER-1',
  currency: 'USD',
  amountCents: 4900,
  status: 'pending',
  paidAt: null,
  rawPayload: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ENROLLMENT = {
  id: 'enr-1',
  status: 'active',
  enrolledAt: new Date().toISOString(),
  completedAt: null,
  course: { id: 'course-1', slug: 'full-stack-development', title: 'Full Stack Development', image: '/img.jpg', level: 'Beginner', pricing: 'paid', domain: null },
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    course: { findFirst: jest.Mock };
    order: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
  };
  let enrollments: { enrollAfterPayment: jest.Mock };
  let notifications: { create: jest.Mock };
  let audit: { record: jest.Mock };
  let currency: { convert: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: { findFirst: jest.fn() },
      order: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    enrollments = { enrollAfterPayment: jest.fn() };
    notifications = { create: jest.fn() };
    audit = { record: jest.fn() };
    currency = { convert: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: CurrencyService, useValue: currency },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  describe('createPendingOrder', () => {
    it('throws NotFoundException for a missing/unpublished course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.createPendingOrder('user-1', 'nope', 'paypal')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for a non-paid course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ ...COURSE, pricing: 'free' });
      await expect(service.createPendingOrder('user-1', 'free-course', 'paypal')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when priceUsdCents is null', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ ...COURSE, priceUsdCents: null });
      await expect(service.createPendingOrder('user-1', 'members-only', 'paypal')).rejects.toThrow(ConflictException);
    });

    it('snapshots the course price server-side, never a client-supplied amount', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE);
      prisma.order.create.mockResolvedValueOnce(ORDER);

      const result = await service.createPendingOrder('user-1', 'full-stack-development', 'paypal');

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', courseId: 'course-1', provider: 'paypal', currency: 'USD', amountCents: 4900 },
      });
      expect(result).toEqual({ order: ORDER, courseTitle: 'Full Stack Development' });
    });

    it('resolves a non-USD amount fresh via CurrencyService, not a precomputed/stale price', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE);
      currency.convert.mockResolvedValueOnce({ currency: 'INR', amountCents: 406_000 });
      prisma.order.create.mockResolvedValueOnce({ ...ORDER, provider: 'razorpay', currency: 'INR', amountCents: 406_000 });

      const result = await service.createPendingOrder('user-1', 'full-stack-development', 'razorpay', 'INR');

      expect(currency.convert).toHaveBeenCalledWith(4900, 'INR');
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', courseId: 'course-1', provider: 'razorpay', currency: 'INR', amountCents: 406_000 },
      });
      expect(result.order.amountCents).toBe(406_000);
    });
  });

  describe('markOrderPaid', () => {
    it('enrolls and notifies when it wins the pending -> paid transition', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...ORDER, status: 'paid' });
      enrollments.enrollAfterPayment.mockResolvedValueOnce(ENROLLMENT);

      const result = await service.markOrderPaid('order-1', { status: 'COMPLETED' });

      expect(enrollments.enrollAfterPayment).toHaveBeenCalledWith('user-1', 'course-1');
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith('user-1', 'order.paid', 'order', 'order-1', {
        provider: 'paypal',
        amountCents: 4900,
        currency: 'USD',
      });
      expect(result.status).toBe('paid');
    });

    it('is a no-op when the order was already paid (e.g. the other confirmation path won the race)', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...ORDER, status: 'paid' });

      await service.markOrderPaid('order-1');

      expect(enrollments.enrollAfterPayment).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('does not throw when the learner was already enrolled via a separate order', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...ORDER, status: 'paid' });
      enrollments.enrollAfterPayment.mockRejectedValueOnce(new ConflictException('You are already enrolled in this course.'));

      const result = await service.markOrderPaid('order-1');

      expect(notifications.create).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('paid');
    });
  });
});
