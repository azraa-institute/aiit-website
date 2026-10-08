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
  let payments: { createPendingOrder: jest.Mock; attachProviderRef: jest.Mock; findByProviderRef: jest.Mock; markOrderPaid: jest.Mock };
  let razorpay: { createOrder: jest.Mock; verifyPaymentSignature: jest.Mock; fetchPayment: jest.Mock };

  beforeEach(async () => {
    payments = {
      createPendingOrder: jest.fn(),
      attachProviderRef: jest.fn(),
      findByProviderRef: jest.fn(),
      markOrderPaid: jest.fn(),
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

    it('rejects a verified payment whose confirmed amount does not match the order', async () => {
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
  });
});
