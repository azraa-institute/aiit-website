import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreateRazorpayOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { RazorpayClientService } from './razorpay-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { VerifyRazorpayPaymentDto } from '../dto/verify-razorpay-payment.dto';
import { PromoCourseSelectionDto } from '../dto/promo-preview.dto';

@Controller('payments/razorpay')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class RazorpayCheckoutController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly razorpay: RazorpayClientService,
  ) {}

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser): Promise<CreateRazorpayOrderResponse> {
    const { order } = await this.payments.createPendingOrder(user.userId, dto.courseSlug, 'razorpay', 'INR');
    const razorpayOrderId = await this.razorpay.createOrder(order.amountCents, order.currency, order.id);
    await this.payments.attachProviderRef(order.id, razorpayOrderId);
    return { razorpayOrderId, amountCents: order.amountCents, currency: order.currency };
  }

  @Post('orders/:razorpayOrderId/verify')
  async verify(
    @Param('razorpayOrderId') razorpayOrderId: string,
    @Body() dto: VerifyRazorpayPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    const order = await this.payments.findByProviderRef('razorpay', razorpayOrderId);
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== user.userId) throw new ForbiddenException();
    // Already confirmed (e.g. the webhook won the race) -- nothing left to verify.
    if (order.status === 'paid') return { status: order.status };

    if (!this.razorpay.verifyPaymentSignature(razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature)) {
      throw new ConflictException('This payment could not be verified.');
    }

    const payment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    // Not a strict equality check: if Razorpay's Convenience Fee model is
    // ever activated on this account (adds Razorpay's own fee on top at
    // checkout when enabled, same mechanism as Paystack's "pass fees to
    // customers"), the amount actually captured is legitimately *more*
    // than what we initialized -- only reject if it's LESS than the
    // order's price, which is what would indicate real tampering.
    if (payment.status !== 'captured' || payment.amountCents < order.amountCents || payment.currency !== order.currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    const paid = await this.payments.markOrderPaid(order.id, payment);
    return { status: paid.status };
  }

  /**
   * Cart/bundle checkout -- creates more than one Order from a single
   * request. PayPal's and Paystack's own checkout controllers have the
   * equivalent `orders/bundle` routes for an ordinary multi-course cart;
   * only this one ever accepts a `promoCode`, since the MBA promo-code
   * discount (see PromoCode in schema.prisma) is INR/Razorpay-only by
   * product decision -- PaymentsService.createPendingBundleOrder rejects
   * a promo code on any other provider outright.
   */
  @Post('orders/bundle')
  async createBundleOrder(@Body() dto: PromoCourseSelectionDto, @CurrentUser() user: AuthenticatedUser): Promise<CreateRazorpayOrderResponse> {
    const { orders, totalAmountCents, currency } = await this.payments.createPendingBundleOrder(user.userId, dto.courseSlugs, dto.promoCode);
    const razorpayOrderId = await this.razorpay.createOrder(totalAmountCents, currency, orders[0].id);
    await this.payments.attachProviderRefMany(orders.map((o) => o.id), razorpayOrderId);
    return { razorpayOrderId, amountCents: totalAmountCents, currency };
  }

  @Post('orders/bundle/:razorpayOrderId/verify')
  async verifyBundle(
    @Param('razorpayOrderId') razorpayOrderId: string,
    @Body() dto: VerifyRazorpayPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    const orders = await this.payments.findAllByProviderRef('razorpay', razorpayOrderId);
    if (orders.length === 0) throw new NotFoundException('Order not found.');
    if (orders.some((o) => o.userId !== user.userId)) throw new ForbiddenException();
    if (orders.every((o) => o.status === 'paid')) return { status: 'paid' };

    if (!this.razorpay.verifyPaymentSignature(razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature)) {
      throw new ConflictException('This payment could not be verified.');
    }

    const payment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    const totalAmountCents = orders.reduce((sum, o) => sum + o.amountCents, 0);
    if (payment.status !== 'captured' || payment.amountCents < totalAmountCents || payment.currency !== orders[0].currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    await Promise.all(orders.map((o) => this.payments.markOrderPaid(o.id, payment)));
    return { status: 'paid' };
  }
}
