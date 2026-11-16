import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../payments.service';
import { PayPalClientService } from './paypal-client.service';
import { PayPalCheckoutController } from './paypal-checkout.controller';

const USER = { userId: 'user-1', role: 'learner' as const };

const PENDING_ORDER = {
  id: 'order-1',
  userId: 'user-1',
  courseId: 'course-1',
  provider: 'paypal',
  providerRef: 'PAYPAL-ORDER-1',
  currency: 'USD',
  amountCents: 4900,
  status: 'pending',
};

describe('PayPalCheckoutController', () => {
  let controller: PayPalCheckoutController;
  let payments: {
    createPendingOrder: jest.Mock;
    attachProviderRef: jest.Mock;
    findByProviderRef: jest.Mock;
    markOrderPaid: jest.Mock;
    createPendingBundleOrder: jest.Mock;
    attachProviderRefMany: jest.Mock;
    findAllByProviderRef: jest.Mock;
  };
  let paypal: { createOrder: jest.Mock; captureOrder: jest.Mock };

  beforeEach(async () => {
    payments = {
      createPendingOrder: jest.fn(),
      attachProviderRef: jest.fn(),
      findByProviderRef: jest.fn(),
      markOrderPaid: jest.fn(),
      createPendingBundleOrder: jest.fn(),
      attachProviderRefMany: jest.fn(),
      findAllByProviderRef: jest.fn(),
    };
    paypal = { createOrder: jest.fn(), captureOrder: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [PayPalCheckoutController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: PayPalClientService, useValue: paypal },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(PayPalCheckoutController);
  });

  describe('createOrder', () => {
    it('creates a pending order, asks PayPal to create a matching order, and stores the PayPal order id', async () => {
      payments.createPendingOrder.mockResolvedValueOnce({ order: PENDING_ORDER, courseTitle: 'Full Stack Development' });
      paypal.createOrder.mockResolvedValueOnce('PAYPAL-ORDER-1');

      const result = await controller.createOrder({ courseSlug: 'full-stack-development' }, USER);

      expect(payments.createPendingOrder).toHaveBeenCalledWith('user-1', 'full-stack-development', 'paypal');
      expect(paypal.createOrder).toHaveBeenCalledWith(4900, 'USD');
      expect(payments.attachProviderRef).toHaveBeenCalledWith('order-1', 'PAYPAL-ORDER-1');
      expect(result).toEqual({ paypalOrderId: 'PAYPAL-ORDER-1' });
    });
  });

  describe('capture', () => {
    it('throws NotFoundException for an unknown PayPal order id', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(null);
      await expect(controller.capture('missing', USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the order belongs to someone else', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, userId: 'someone-else' });
      await expect(controller.capture('PAYPAL-ORDER-1', USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op (and never re-calls PayPal) when the order is already paid', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.capture('PAYPAL-ORDER-1', USER);

      expect(paypal.captureOrder).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a capture whose confirmed amount does not match the order', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      paypal.captureOrder.mockResolvedValueOnce({ status: 'COMPLETED', amountCents: 100, currency: 'USD' });

      await expect(controller.capture('PAYPAL-ORDER-1', USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('marks the order paid once PayPal confirms a matching capture', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      paypal.captureOrder.mockResolvedValueOnce({ status: 'COMPLETED', amountCents: 4900, currency: 'USD' });
      payments.markOrderPaid.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.capture('PAYPAL-ORDER-1', USER);

      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', { status: 'COMPLETED', amountCents: 4900, currency: 'USD' });
      expect(result).toEqual({ status: 'paid' });
    });
  });

  describe('createBundleOrder', () => {
    const BUNDLE_DTO = { courseSlugs: ['full-stack', 'cloud-fundamentals'] };
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', courseId: 'course-1', amountCents: 4900 },
      { ...PENDING_ORDER, id: 'order-2', courseId: 'course-2', amountCents: 3900 },
    ];

    it('prices the bundle, asks PayPal for one combined order, and attaches it to every bundled order', async () => {
      payments.createPendingBundleOrder.mockResolvedValueOnce({ orders: BUNDLE_ORDERS, totalAmountCents: 8800, currency: 'USD' });
      paypal.createOrder.mockResolvedValueOnce('PAYPAL-BUNDLE-1');

      const result = await controller.createBundleOrder(BUNDLE_DTO, USER);

      expect(payments.createPendingBundleOrder).toHaveBeenCalledWith('user-1', BUNDLE_DTO.courseSlugs, undefined, 'paypal');
      expect(paypal.createOrder).toHaveBeenCalledWith(8800, 'USD');
      expect(payments.attachProviderRefMany).toHaveBeenCalledWith(['order-1', 'order-2'], 'PAYPAL-BUNDLE-1');
      expect(result).toEqual({ paypalOrderId: 'PAYPAL-BUNDLE-1' });
    });
  });

  describe('captureBundle', () => {
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', amountCents: 4900 },
      { ...PENDING_ORDER, id: 'order-2', amountCents: 3900 },
    ];

    it('throws NotFoundException when no order shares the given providerRef', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([]);
      await expect(controller.captureBundle('missing', USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException if any bundled order belongs to someone else', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([...BUNDLE_ORDERS, { ...BUNDLE_ORDERS[0], id: 'order-3', userId: 'someone-else' }]);
      await expect(controller.captureBundle('PAYPAL-BUNDLE-1', USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op (and never re-calls PayPal) when every bundled order is already paid', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS.map((o) => ({ ...o, status: 'paid' })));
      const result = await controller.captureBundle('PAYPAL-BUNDLE-1', USER);
      expect(paypal.captureOrder).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a capture whose confirmed amount falls short of the full bundle', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      paypal.captureOrder.mockResolvedValueOnce({ status: 'COMPLETED', amountCents: 4900, currency: 'USD' });

      await expect(controller.captureBundle('PAYPAL-BUNDLE-1', USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('marks every bundled order paid once PayPal confirms a matching capture of the full total', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      const capture = { status: 'COMPLETED', amountCents: 8800, currency: 'USD' };
      paypal.captureOrder.mockResolvedValueOnce(capture);
      payments.markOrderPaid.mockResolvedValue({ status: 'paid' });

      const result = await controller.captureBundle('PAYPAL-BUNDLE-1', USER);

      expect(paypal.captureOrder).toHaveBeenCalledTimes(1);
      expect(payments.markOrderPaid).toHaveBeenCalledTimes(2);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', capture);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-2', capture);
      expect(result).toEqual({ status: 'paid' });
    });
  });
});
