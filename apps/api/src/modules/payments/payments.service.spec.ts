import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { PayPalClientService } from './paypal/paypal-client.service';
import { RazorpayClientService } from './razorpay/razorpay-client.service';
import { PaystackClientService } from './paystack/paystack-client.service';
import { PromoCodesService } from './promo-codes/promo-codes.service';
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
    order: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let enrollments: { enrollAfterPayment: jest.Mock };
  let notifications: { create: jest.Mock };
  let audit: { record: jest.Mock };
  let currency: { convert: jest.Mock };
  let paypal: { getCaptureId: jest.Mock; refundCapture: jest.Mock };
  let razorpay: { findCapturedPaymentId: jest.Mock; refundPayment: jest.Mock };
  let paystack: { refundTransaction: jest.Mock };
  let promoCodes: { resolveCourseIds: jest.Mock; priceCart: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: { findFirst: jest.fn() },
      order: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    enrollments = { enrollAfterPayment: jest.fn() };
    notifications = { create: jest.fn() };
    audit = { record: jest.fn() };
    currency = { convert: jest.fn() };
    paypal = { getCaptureId: jest.fn(), refundCapture: jest.fn() };
    razorpay = { findCapturedPaymentId: jest.fn(), refundPayment: jest.fn() };
    paystack = { refundTransaction: jest.fn() };
    promoCodes = { resolveCourseIds: jest.fn(), priceCart: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: CurrencyService, useValue: currency },
        { provide: PayPalClientService, useValue: paypal },
        { provide: RazorpayClientService, useValue: razorpay },
        { provide: PaystackClientService, useValue: paystack },
        { provide: PromoCodesService, useValue: promoCodes },
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

    it('removes any matching CartItem once the order is paid -- harmless no-op if it was never a cart checkout', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...ORDER, status: 'paid' });
      enrollments.enrollAfterPayment.mockResolvedValueOnce(ENROLLMENT);

      await service.markOrderPaid('order-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', courseId: 'course-1' } });
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

  describe('refundOrder', () => {
    const PAID_ORDER = { ...ORDER, status: 'paid' };

    it('throws NotFoundException for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.refundOrder('admin-1', 'order-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for an order that is not paid', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({ ...ORDER, status: 'pending' });
      await expect(service.refundOrder('admin-1', 'order-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the order has no providerRef', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({ ...PAID_ORDER, providerRef: null });
      await expect(service.refundOrder('admin-1', 'order-1')).rejects.toThrow(ConflictException);
    });

    it('PayPal: looks up the capture id from the stored order id, then refunds that capture', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(PAID_ORDER);
      paypal.getCaptureId.mockResolvedValueOnce('CAPTURE-1');
      paypal.refundCapture.mockResolvedValueOnce({ refundId: 'REFUND-1', status: 'COMPLETED' });
      prisma.order.update.mockResolvedValueOnce({ ...PAID_ORDER, status: 'refunded', refundRef: 'REFUND-1' });

      const result = await service.refundOrder('admin-1', 'order-1');

      expect(paypal.getCaptureId).toHaveBeenCalledWith('PAYPAL-ORDER-1');
      expect(paypal.refundCapture).toHaveBeenCalledWith('CAPTURE-1');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'refunded', refundRef: 'REFUND-1' }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        'admin-1',
        'order.refund',
        'order',
        'order-1',
        expect.objectContaining({ refundRef: 'REFUND-1' }),
      );
      expect(result.status).toBe('refunded');
    });

    it('PayPal: throws ConflictException if no capture can be found for the order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(PAID_ORDER);
      paypal.getCaptureId.mockResolvedValueOnce(null);

      await expect(service.refundOrder('admin-1', 'order-1')).rejects.toThrow(ConflictException);
      expect(paypal.refundCapture).not.toHaveBeenCalled();
    });

    it('Razorpay: looks up the captured payment id from the stored order id, then refunds that payment', async () => {
      const order = { ...PAID_ORDER, provider: 'razorpay', providerRef: 'RZP-ORDER-1' };
      prisma.order.findUnique.mockResolvedValueOnce(order);
      razorpay.findCapturedPaymentId.mockResolvedValueOnce('pay_1');
      razorpay.refundPayment.mockResolvedValueOnce({ refundId: 'rfnd_1', status: 'processed' });
      prisma.order.update.mockResolvedValueOnce({ ...order, status: 'refunded', refundRef: 'rfnd_1' });

      const result = await service.refundOrder('admin-1', 'order-1');

      expect(razorpay.findCapturedPaymentId).toHaveBeenCalledWith('RZP-ORDER-1');
      expect(razorpay.refundPayment).toHaveBeenCalledWith('pay_1');
      expect(result.refundRef).toBe('rfnd_1');
    });

    it('Paystack: refunds directly against the stored transaction reference, no extra lookup', async () => {
      const order = { ...PAID_ORDER, provider: 'paystack', providerRef: 'PSK-REF-1' };
      prisma.order.findUnique.mockResolvedValueOnce(order);
      paystack.refundTransaction.mockResolvedValueOnce({ refundId: '123', status: 'processed' });
      prisma.order.update.mockResolvedValueOnce({ ...order, status: 'refunded', refundRef: '123' });

      const result = await service.refundOrder('admin-1', 'order-1');

      expect(paystack.refundTransaction).toHaveBeenCalledWith('PSK-REF-1');
      expect(result.refundRef).toBe('123');
    });
  });

  describe('findByProviderRef', () => {
    it('looks up via findFirst, not findUnique, now that the unique index also covers courseId', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(ORDER);
      const result = await service.findByProviderRef('paypal', 'PAYPAL-ORDER-1');
      expect(prisma.order.findFirst).toHaveBeenCalledWith({ where: { provider: 'paypal', providerRef: 'PAYPAL-ORDER-1' } });
      expect(result).toBe(ORDER);
    });
  });

  describe('findAllByProviderRef', () => {
    it('returns every Order row sharing one providerRef', async () => {
      const bundle = [ORDER, { ...ORDER, id: 'order-2', courseId: 'course-2' }];
      prisma.order.findMany.mockResolvedValueOnce(bundle);
      const result = await service.findAllByProviderRef('razorpay', 'RZP-ORDER-1');
      expect(prisma.order.findMany).toHaveBeenCalledWith({ where: { provider: 'razorpay', providerRef: 'RZP-ORDER-1' } });
      expect(result).toBe(bundle);
    });
  });

  describe('createPendingBundleOrder', () => {
    it('prices + creates one pending Order per course, inside one transaction', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1', 'course-2', 'course-3']);
      promoCodes.priceCart.mockResolvedValueOnce({
        promoCodeId: 'promo-1',
        lines: [
          { courseId: 'course-1', amountCents: 700000, eligible: true },
          { courseId: 'course-2', amountCents: 700000, eligible: true },
          { courseId: 'course-3', amountCents: 700000, eligible: true },
        ],
        totalAmountCents: 2100000,
        currency: 'INR',
      });
      prisma.order.create
        .mockResolvedValueOnce({ ...ORDER, id: 'order-1', courseId: 'course-1', provider: 'razorpay', currency: 'INR', amountCents: 700000, promoCodeId: 'promo-1' })
        .mockResolvedValueOnce({ ...ORDER, id: 'order-2', courseId: 'course-2', provider: 'razorpay', currency: 'INR', amountCents: 700000, promoCodeId: 'promo-1' })
        .mockResolvedValueOnce({ ...ORDER, id: 'order-3', courseId: 'course-3', provider: 'razorpay', currency: 'INR', amountCents: 700000, promoCodeId: 'promo-1' });

      const result = await service.createPendingBundleOrder('user-1', ['ai-markets', 'zoho-crm', 'lead-gen'], 'mba2027');

      expect(promoCodes.resolveCourseIds).toHaveBeenCalledWith(['ai-markets', 'zoho-crm', 'lead-gen'], prisma);
      expect(promoCodes.priceCart).toHaveBeenCalledWith(['course-1', 'course-2', 'course-3'], 'mba2027', 'INR', expect.any(Function), prisma);
      expect(prisma.order.create).toHaveBeenCalledTimes(3);
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', courseId: 'course-1', provider: 'razorpay', currency: 'INR', amountCents: 700000, promoCodeId: 'promo-1' },
      });
      expect(result.orders).toHaveLength(3);
      expect(result.totalAmountCents).toBe(2100000);
      expect(result.currency).toBe('INR');
    });

    it('checks out a cart with no promo code at all, every line priced at its own rate and no promoCodeId stamped', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1', 'course-2']);
      promoCodes.priceCart.mockResolvedValueOnce({
        promoCodeId: null,
        lines: [
          { courseId: 'course-1', amountCents: 300000, eligible: false },
          { courseId: 'course-2', amountCents: 200000, eligible: false },
        ],
        totalAmountCents: 500000,
        currency: 'INR',
      });
      prisma.order.create
        .mockResolvedValueOnce({ ...ORDER, id: 'order-1', courseId: 'course-1', amountCents: 300000, promoCodeId: null })
        .mockResolvedValueOnce({ ...ORDER, id: 'order-2', courseId: 'course-2', amountCents: 200000, promoCodeId: null });

      const result = await service.createPendingBundleOrder('user-1', ['full-stack', 'cloud-fundamentals']);

      expect(promoCodes.priceCart).toHaveBeenCalledWith(['course-1', 'course-2'], undefined, 'INR', expect.any(Function), prisma);
      expect(prisma.order.create).toHaveBeenCalledWith({ data: { userId: 'user-1', courseId: 'course-1', provider: 'razorpay', currency: 'INR', amountCents: 300000, promoCodeId: null } });
      expect(result.totalAmountCents).toBe(500000);
    });

    it('only stamps promoCodeId on the Order rows for lines priceCart actually marked eligible', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1', 'some-other-course']);
      promoCodes.priceCart.mockResolvedValueOnce({
        promoCodeId: 'promo-1',
        lines: [
          { courseId: 'course-1', amountCents: 700000, eligible: true },
          { courseId: 'some-other-course', amountCents: 20000, eligible: false },
        ],
        totalAmountCents: 720000,
        currency: 'INR',
      });
      prisma.order.create
        .mockResolvedValueOnce({ ...ORDER, id: 'order-1', courseId: 'course-1' })
        .mockResolvedValueOnce({ ...ORDER, id: 'order-2', courseId: 'some-other-course' });

      await service.createPendingBundleOrder('user-1', ['ai-markets', 'other'], 'mba2027');

      expect(prisma.order.create).toHaveBeenCalledWith({ data: expect.objectContaining({ courseId: 'course-1', promoCodeId: 'promo-1' }) });
      expect(prisma.order.create).toHaveBeenCalledWith({ data: expect.objectContaining({ courseId: 'some-other-course', promoCodeId: null }) });
    });

    it('propagates a rejected (e.g. cap-exceeded) priceCart without creating any Order', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1']);
      promoCodes.priceCart.mockRejectedValueOnce(new ConflictException('This promo code has reached its redemption limit.'));

      await expect(service.createPendingBundleOrder('user-1', ['ai-markets'], 'mba2027')).rejects.toThrow(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('defaults to USD for a PayPal bundle', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1', 'course-2']);
      promoCodes.priceCart.mockResolvedValueOnce({
        promoCodeId: null,
        lines: [
          { courseId: 'course-1', amountCents: 15000, eligible: false },
          { courseId: 'course-2', amountCents: 15000, eligible: false },
        ],
        totalAmountCents: 30000,
        currency: 'USD',
      });
      prisma.order.create
        .mockResolvedValueOnce({ ...ORDER, id: 'order-1', courseId: 'course-1', provider: 'paypal', currency: 'USD', amountCents: 15000, promoCodeId: null })
        .mockResolvedValueOnce({ ...ORDER, id: 'order-2', courseId: 'course-2', provider: 'paypal', currency: 'USD', amountCents: 15000, promoCodeId: null });

      const result = await service.createPendingBundleOrder('user-1', ['full-stack', 'cloud-fundamentals'], undefined, 'paypal');

      expect(promoCodes.priceCart).toHaveBeenCalledWith(['course-1', 'course-2'], undefined, 'USD', expect.any(Function), prisma);
      expect(prisma.order.create).toHaveBeenCalledWith({ data: { userId: 'user-1', courseId: 'course-1', provider: 'paypal', currency: 'USD', amountCents: 15000, promoCodeId: null } });
      expect(result.currency).toBe('USD');
    });

    it('defaults to NGN for a Paystack bundle', async () => {
      promoCodes.resolveCourseIds.mockResolvedValueOnce(['course-1']);
      promoCodes.priceCart.mockResolvedValueOnce({
        promoCodeId: null,
        lines: [{ courseId: 'course-1', amountCents: 500000, eligible: false }],
        totalAmountCents: 500000,
        currency: 'NGN',
      });
      prisma.order.create.mockResolvedValueOnce({ ...ORDER, id: 'order-1', courseId: 'course-1', provider: 'paystack', currency: 'NGN', amountCents: 500000, promoCodeId: null });

      const result = await service.createPendingBundleOrder('user-1', ['full-stack'], undefined, 'paystack');

      expect(promoCodes.priceCart).toHaveBeenCalledWith(['course-1'], undefined, 'NGN', expect.any(Function), prisma);
      expect(result.currency).toBe('NGN');
    });

    it('rejects a promo code on any provider other than Razorpay without ever calling priceCart', async () => {
      await expect(service.createPendingBundleOrder('user-1', ['ai-markets'], 'mba2027', 'paypal')).rejects.toThrow(BadRequestException);
      await expect(service.createPendingBundleOrder('user-1', ['ai-markets'], 'mba2027', 'paystack')).rejects.toThrow(BadRequestException);
      expect(promoCodes.priceCart).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  describe('attachProviderRefMany', () => {
    it('attaches one shared providerRef to every order id given', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 3 });
      await service.attachProviderRefMany(['order-1', 'order-2', 'order-3'], 'RZP-ORDER-1');
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1', 'order-2', 'order-3'] } },
        data: { providerRef: 'RZP-ORDER-1' },
      });
    });
  });
});
