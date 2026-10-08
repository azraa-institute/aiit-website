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
  let payments: { createPendingOrder: jest.Mock; attachProviderRef: jest.Mock; findByProviderRef: jest.Mock; markOrderPaid: jest.Mock };
  let paystack: { initializeTransaction: jest.Mock; verifyTransaction: jest.Mock };

  beforeEach(async () => {
    payments = {
      createPendingOrder: jest.fn(),
      attachProviderRef: jest.fn(),
      findByProviderRef: jest.fn(),
      markOrderPaid: jest.fn(),
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
});
