import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../payments.service';
import { RazorpayClientService } from './razorpay-client.service';
import { RazorpayCheckoutController } from './razorpay-checkout.controller';

const USER = { userId: 'user-1', role: 'learner' as const };

const PENDING_ORDER = {
  id: 'order-1',
  userId: 'user-1',
  courseId: 'course-1',
  provider: 'razorpay',
  providerRef: 'RAZORPAY-ORDER-1',
  currency: 'INR',
  amountCents: 406_000,
  status: 'pending',
};

describe('RazorpayCheckoutController', () => {
  let controller: RazorpayCheckoutController;
  let payments: {
    createPendingOrder: jest.Mock;
    attachProviderRef: jest.Mock;
    findByProviderRef: jest.Mock;
    markOrderPaid: jest.Mock;
    createPendingBundleOrder: jest.Mock;
    attachProviderRefMany: jest.Mock;
    findAllByProviderRef: jest.Mock;
  };
  let razorpay: { createOrder: jest.Mock; verifyPaymentSignature: jest.Mock; fetchPayment: jest.Mock };

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
    razorpay = { createOrder: jest.fn(), verifyPaymentSignature: jest.fn(), fetchPayment: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [RazorpayCheckoutController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: RazorpayClientService, useValue: razorpay },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(RazorpayCheckoutController);
  });

  describe('createOrder', () => {
    it('creates a pending order in INR, asks Razorpay to create a matching order, and stores the Razorpay order id', async () => {
      payments.createPendingOrder.mockResolvedValueOnce({ order: PENDING_ORDER, courseTitle: 'Full Stack Development' });
      razorpay.createOrder.mockResolvedValueOnce('RAZORPAY-ORDER-1');

      const result = await controller.createOrder({ courseSlug: 'full-stack-development' }, USER);

      expect(payments.createPendingOrder).toHaveBeenCalledWith('user-1', 'full-stack-development', 'razorpay', 'INR');
      expect(razorpay.createOrder).toHaveBeenCalledWith(406_000, 'INR', 'order-1');
      expect(payments.attachProviderRef).toHaveBeenCalledWith('order-1', 'RAZORPAY-ORDER-1');
      expect(result).toEqual({ razorpayOrderId: 'RAZORPAY-ORDER-1', amountCents: 406_000, currency: 'INR' });
    });
  });

  describe('verify', () => {
    const DTO = { razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1' };

    it('throws NotFoundException for an unknown Razorpay order id', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(null);
      await expect(controller.verify('missing', DTO, USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the order belongs to someone else', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, userId: 'someone-else' });
      await expect(controller.verify('RAZORPAY-ORDER-1', DTO, USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op (and never re-checks Razorpay) when the order is already paid', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('RAZORPAY-ORDER-1', DTO, USER);

      expect(razorpay.verifyPaymentSignature).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a payment whose signature does not verify', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(false);

      await expect(controller.verify('RAZORPAY-ORDER-1', DTO, USER)).rejects.toBeInstanceOf(ConflictException);
      expect(razorpay.fetchPayment).not.toHaveBeenCalled();
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('rejects a verified payment whose confirmed amount is less than the order', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(true);
      razorpay.fetchPayment.mockResolvedValueOnce({ status: 'captured', amountCents: 100, currency: 'INR', orderId: 'RAZORPAY-ORDER-1' });

      await expect(controller.verify('RAZORPAY-ORDER-1', DTO, USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('marks the order paid once the signature verifies and Razorpay confirms a matching captured payment', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(true);
      const payment = { status: 'captured', amountCents: 406_000, currency: 'INR', orderId: 'RAZORPAY-ORDER-1' };
      razorpay.fetchPayment.mockResolvedValueOnce(payment);
      payments.markOrderPaid.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('RAZORPAY-ORDER-1', DTO, USER);

      expect(razorpay.verifyPaymentSignature).toHaveBeenCalledWith('RAZORPAY-ORDER-1', 'pay_1', 'sig_1');
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', payment);
      expect(result).toEqual({ status: 'paid' });
    });

    it('accepts a confirmed amount greater than the order -- a Convenience Fee, if ever activated, adds Razorpay\'s fee on top', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(true);
      const payment = { status: 'captured', amountCents: 406_000 + 5_000, currency: 'INR', orderId: 'RAZORPAY-ORDER-1' };
      razorpay.fetchPayment.mockResolvedValueOnce(payment);
      payments.markOrderPaid.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('RAZORPAY-ORDER-1', DTO, USER);

      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', payment);
      expect(result).toEqual({ status: 'paid' });
    });
  });

  describe('createBundleOrder', () => {
    const BUNDLE_DTO = { courseSlugs: ['ai-markets', 'zoho-crm', 'lead-gen'], promoCode: 'mba2027' };
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', courseId: 'course-1', amountCents: 700_000 },
      { ...PENDING_ORDER, id: 'order-2', courseId: 'course-2', amountCents: 700_000 },
      { ...PENDING_ORDER, id: 'order-3', courseId: 'course-3', amountCents: 700_000 },
    ];

    it('prices the bundle, asks Razorpay for one combined order, and attaches it to every bundled order', async () => {
      payments.createPendingBundleOrder.mockResolvedValueOnce({ orders: BUNDLE_ORDERS, totalAmountCents: 2_100_000, currency: 'INR' });
      razorpay.createOrder.mockResolvedValueOnce('RAZORPAY-BUNDLE-1');

      const result = await controller.createBundleOrder(BUNDLE_DTO, USER);

      expect(payments.createPendingBundleOrder).toHaveBeenCalledWith('user-1', BUNDLE_DTO.courseSlugs, 'mba2027');
      expect(razorpay.createOrder).toHaveBeenCalledWith(2_100_000, 'INR', 'order-1');
      expect(payments.attachProviderRefMany).toHaveBeenCalledWith(['order-1', 'order-2', 'order-3'], 'RAZORPAY-BUNDLE-1');
      expect(result).toEqual({ razorpayOrderId: 'RAZORPAY-BUNDLE-1', amountCents: 2_100_000, currency: 'INR' });
    });
  });

  describe('verifyBundle', () => {
    const DTO = { razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1' };
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', amountCents: 700_000 },
      { ...PENDING_ORDER, id: 'order-2', amountCents: 700_000 },
      { ...PENDING_ORDER, id: 'order-3', amountCents: 700_000 },
    ];

    it('throws NotFoundException when no order shares the given providerRef', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([]);
      await expect(controller.verifyBundle('missing', DTO, USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException if any bundled order belongs to someone else', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([...BUNDLE_ORDERS, { ...BUNDLE_ORDERS[0], id: 'order-4', userId: 'someone-else' }]);
      await expect(controller.verifyBundle('RAZORPAY-BUNDLE-1', DTO, USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op when every bundled order is already paid', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS.map((o) => ({ ...o, status: 'paid' })));
      const result = await controller.verifyBundle('RAZORPAY-BUNDLE-1', DTO, USER);
      expect(razorpay.verifyPaymentSignature).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('marks every bundled order paid once the signature verifies and the captured total covers them all', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(true);
      const payment = { status: 'captured', amountCents: 2_100_000, currency: 'INR', orderId: 'RAZORPAY-BUNDLE-1' };
      razorpay.fetchPayment.mockResolvedValueOnce(payment);
      payments.markOrderPaid.mockResolvedValue({ status: 'paid' });

      const result = await controller.verifyBundle('RAZORPAY-BUNDLE-1', DTO, USER);

      expect(payments.markOrderPaid).toHaveBeenCalledTimes(3);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', payment);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-2', payment);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-3', payment);
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a captured total that falls short of the full bundle', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      razorpay.verifyPaymentSignature.mockReturnValueOnce(true);
      razorpay.fetchPayment.mockResolvedValueOnce({ status: 'captured', amountCents: 700_000, currency: 'INR', orderId: 'RAZORPAY-BUNDLE-1' });

      await expect(controller.verifyBundle('RAZORPAY-BUNDLE-1', DTO, USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });
  });
});
