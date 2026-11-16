import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreatePaystackOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { PaystackClientService } from './paystack-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { PromoCourseSelectionDto } from '../dto/promo-preview.dto';

@Controller('payments/paystack')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PaystackCheckoutController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly paystack: PaystackClientService,
  ) {}

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser): Promise<CreatePaystackOrderResponse> {
    if (!user.email) throw new ConflictException('Your account has no email on file, so this Paystack payment cannot start.');
    const { order } = await this.payments.createPendingOrder(user.userId, dto.courseSlug, 'paystack', 'NGN');
    const { accessCode, reference } = await this.paystack.initializeTransaction(order.amountCents, order.currency, user.email, order.id);
    await this.payments.attachProviderRef(order.id, reference);
    return { accessCode, reference };
  }

  @Post('orders/:reference/verify')
  async verify(@Param('reference') reference: string, @CurrentUser() user: AuthenticatedUser): Promise<{ status: string }> {
    const order = await this.payments.findByProviderRef('paystack', reference);
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== user.userId) throw new ForbiddenException();
    // Already confirmed (e.g. the webhook won the race) -- nothing left to verify.
    if (order.status === 'paid') return { status: order.status };

    const transaction = await this.paystack.verifyTransaction(reference);
    // Not a strict equality check: when "pass transaction fees to customers"
    // is enabled on Paystack's side, Paystack adds its own fee on top at
    // checkout, so the amount actually charged is legitimately *more* than
    // what we initialized -- only reject if it's LESS than the order's
    // price (the one thing that would indicate real tampering/mismatch).
    if (transaction.status !== 'success' || transaction.amountCents < order.amountCents || transaction.currency !== order.currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    const paid = await this.payments.markOrderPaid(order.id, transaction);
    return { status: paid.status };
  }

  /**
   * An ordinary multi-course cart checkout (never a promo code -- the MBA
   * discount is Razorpay/INR-only; PaymentsService rejects one outright).
   */
  @Post('orders/bundle')
  async createBundleOrder(@Body() dto: PromoCourseSelectionDto, @CurrentUser() user: AuthenticatedUser): Promise<CreatePaystackOrderResponse> {
    if (!user.email) throw new ConflictException('Your account has no email on file, so this Paystack payment cannot start.');
    const { orders, totalAmountCents, currency } = await this.payments.createPendingBundleOrder(user.userId, dto.courseSlugs, dto.promoCode, 'paystack');
    const { accessCode, reference } = await this.paystack.initializeTransaction(totalAmountCents, currency, user.email, orders[0].id);
    await this.payments.attachProviderRefMany(orders.map((o) => o.id), reference);
    return { accessCode, reference };
  }

  @Post('orders/bundle/:reference/verify')
  async verifyBundle(@Param('reference') reference: string, @CurrentUser() user: AuthenticatedUser): Promise<{ status: string }> {
    const orders = await this.payments.findAllByProviderRef('paystack', reference);
    if (orders.length === 0) throw new NotFoundException('Order not found.');
    if (orders.some((o) => o.userId !== user.userId)) throw new ForbiddenException();
    if (orders.every((o) => o.status === 'paid')) return { status: 'paid' };

    const transaction = await this.paystack.verifyTransaction(reference);
    const totalAmountCents = orders.reduce((sum, o) => sum + o.amountCents, 0);
    // Not a strict equality check: see the matching comment in verify() --
    // "pass transaction fees to customers" legitimately inflates the amount.
    if (transaction.status !== 'success' || transaction.amountCents < totalAmountCents || transaction.currency !== orders[0].currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    await Promise.all(orders.map((o) => this.payments.markOrderPaid(o.id, transaction)));
    return { status: 'paid' };
  }
}
