import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../payments.service';
import { PaystackClientService } from './paystack-client.service';
import { PaystackCheckoutController } from './paystack-checkout.controller';

const USER = { userId: 'user-1', role: 'learner' as const, email: 'learner@example.com' };

const PENDING_ORDER = {
  id: 'order-1',
  userId: 'user-1',
  courseId: 'course-1',
  provider: 'paystack',
  providerRef: 'PAYSTACK-REF-1',
  currency: 'NGN',
  amountCents: 6_020_000,
  status: 'pending',
};

describe('PaystackCheckoutController', () => {
  let controller: PaystackCheckoutController;
  let payments: {
    createPendingOrder: jest.Mock;
    attachProviderRef: jest.Mock;
    findByProviderRef: jest.Mock;
    markOrderPaid: jest.Mock;
    createPendingBundleOrder: jest.Mock;
    attachProviderRefMany: jest.Mock;
    findAllByProviderRef: jest.Mock;
  };
  let paystack: { initializeTransaction: jest.Mock; verifyTransaction: jest.Mock };

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
    paystack = { initializeTransaction: jest.fn(), verifyTransaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaystackCheckoutController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: PaystackClientService, useValue: paystack },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(PaystackCheckoutController);
  });

  describe('createOrder', () => {
    it('throws ConflictException when the user has no email on file', async () => {
      await expect(controller.createOrder({ courseSlug: 'full-stack-development' }, { ...USER, email: undefined })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(payments.createPendingOrder).not.toHaveBeenCalled();
    });

    it('creates a pending order in NGN, asks Paystack to initialize a matching transaction, and stores the reference', async () => {
      payments.createPendingOrder.mockResolvedValueOnce({ order: PENDING_ORDER, courseTitle: 'Full Stack Development' });
      paystack.initializeTransaction.mockResolvedValueOnce({ accessCode: 'ACCESS-1', reference: 'PAYSTACK-REF-1' });

      const result = await controller.createOrder({ courseSlug: 'full-stack-development' }, USER);

      expect(payments.createPendingOrder).toHaveBeenCalledWith('user-1', 'full-stack-development', 'paystack', 'NGN');
      expect(paystack.initializeTransaction).toHaveBeenCalledWith(6_020_000, 'NGN', 'learner@example.com', 'order-1');
      expect(payments.attachProviderRef).toHaveBeenCalledWith('order-1', 'PAYSTACK-REF-1');
      expect(result).toEqual({ accessCode: 'ACCESS-1', reference: 'PAYSTACK-REF-1' });
    });
  });

  describe('verify', () => {
    it('throws NotFoundException for an unknown reference', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(null);
      await expect(controller.verify('missing', USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the order belongs to someone else', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, userId: 'someone-else' });
      await expect(controller.verify('PAYSTACK-REF-1', USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op (and never re-checks Paystack) when the order is already paid', async () => {
      payments.findByProviderRef.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('PAYSTACK-REF-1', USER);

      expect(paystack.verifyTransaction).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a verified transaction whose confirmed amount is less than the order', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      paystack.verifyTransaction.mockResolvedValueOnce({ status: 'success', amountCents: 100, currency: 'NGN' });

      await expect(controller.verify('PAYSTACK-REF-1', USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('marks the order paid once Paystack confirms a matching successful transaction', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      const transaction = { status: 'success', amountCents: 6_020_000, currency: 'NGN' };
      paystack.verifyTransaction.mockResolvedValueOnce(transaction);
      payments.markOrderPaid.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('PAYSTACK-REF-1', USER);

      expect(paystack.verifyTransaction).toHaveBeenCalledWith('PAYSTACK-REF-1');
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', transaction);
      expect(result).toEqual({ status: 'paid' });
    });

    it('accepts a confirmed amount greater than the order -- "pass transaction fees to customers" adds Paystack\'s fee on top', async () => {
      payments.findByProviderRef.mockResolvedValueOnce(PENDING_ORDER);
      const transaction = { status: 'success', amountCents: 6_020_000 + 5_000, currency: 'NGN' };
      paystack.verifyTransaction.mockResolvedValueOnce(transaction);
      payments.markOrderPaid.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'paid' });

      const result = await controller.verify('PAYSTACK-REF-1', USER);

      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', transaction);
      expect(result).toEqual({ status: 'paid' });
    });
  });

  describe('createBundleOrder', () => {
    const BUNDLE_DTO = { courseSlugs: ['full-stack', 'cloud-fundamentals'] };
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', courseId: 'course-1', amountCents: 6_020_000 },
      { ...PENDING_ORDER, id: 'order-2', courseId: 'course-2', amountCents: 4_010_000 },
    ];

    it('throws ConflictException when the user has no email on file', async () => {
      await expect(controller.createBundleOrder(BUNDLE_DTO, { ...USER, email: undefined })).rejects.toBeInstanceOf(ConflictException);
      expect(payments.createPendingBundleOrder).not.toHaveBeenCalled();
    });

    it('prices the bundle, asks Paystack to initialize one combined transaction, and attaches it to every bundled order', async () => {
      payments.createPendingBundleOrder.mockResolvedValueOnce({ orders: BUNDLE_ORDERS, totalAmountCents: 10_030_000, currency: 'NGN' });
      paystack.initializeTransaction.mockResolvedValueOnce({ accessCode: 'ACCESS-1', reference: 'PAYSTACK-BUNDLE-1' });

      const result = await controller.createBundleOrder(BUNDLE_DTO, USER);

      expect(payments.createPendingBundleOrder).toHaveBeenCalledWith('user-1', BUNDLE_DTO.courseSlugs, undefined, 'paystack');
      expect(paystack.initializeTransaction).toHaveBeenCalledWith(10_030_000, 'NGN', 'learner@example.com', 'order-1');
      expect(payments.attachProviderRefMany).toHaveBeenCalledWith(['order-1', 'order-2'], 'PAYSTACK-BUNDLE-1');
      expect(result).toEqual({ accessCode: 'ACCESS-1', reference: 'PAYSTACK-BUNDLE-1' });
    });
  });

  describe('verifyBundle', () => {
    const BUNDLE_ORDERS = [
      { ...PENDING_ORDER, id: 'order-1', amountCents: 6_020_000 },
      { ...PENDING_ORDER, id: 'order-2', amountCents: 4_010_000 },
    ];

    it('throws NotFoundException when no order shares the given reference', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([]);
      await expect(controller.verifyBundle('missing', USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException if any bundled order belongs to someone else', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce([...BUNDLE_ORDERS, { ...BUNDLE_ORDERS[0], id: 'order-3', userId: 'someone-else' }]);
      await expect(controller.verifyBundle('PAYSTACK-BUNDLE-1', USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is a no-op (and never re-checks Paystack) when every bundled order is already paid', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS.map((o) => ({ ...o, status: 'paid' })));
      const result = await controller.verifyBundle('PAYSTACK-BUNDLE-1', USER);
      expect(paystack.verifyTransaction).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'paid' });
    });

    it('rejects a verified total that falls short of the full bundle', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      paystack.verifyTransaction.mockResolvedValueOnce({ status: 'success', amountCents: 6_020_000, currency: 'NGN' });

      await expect(controller.verifyBundle('PAYSTACK-BUNDLE-1', USER)).rejects.toBeInstanceOf(ConflictException);
      expect(payments.markOrderPaid).not.toHaveBeenCalled();
    });

    it('marks every bundled order paid once Paystack confirms a matching successful transaction covering the full total', async () => {
      payments.findAllByProviderRef.mockResolvedValueOnce(BUNDLE_ORDERS);
      const transaction = { status: 'success', amountCents: 10_030_000, currency: 'NGN' };
      paystack.verifyTransaction.mockResolvedValueOnce(transaction);
      payments.markOrderPaid.mockResolvedValue({ status: 'paid' });

      const result = await controller.verifyBundle('PAYSTACK-BUNDLE-1', USER);

      expect(paystack.verifyTransaction).toHaveBeenCalledTimes(1);
      expect(payments.markOrderPaid).toHaveBeenCalledTimes(2);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-1', transaction);
      expect(payments.markOrderPaid).toHaveBeenCalledWith('order-2', transaction);
      expect(result).toEqual({ status: 'paid' });
    });
  });
});
