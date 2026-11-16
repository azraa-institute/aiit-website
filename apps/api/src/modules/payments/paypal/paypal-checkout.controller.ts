import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreatePayPalOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { PayPalClientService } from './paypal-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { PromoCourseSelectionDto } from '../dto/promo-preview.dto';

@Controller('payments/paypal')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PayPalCheckoutController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly paypal: PayPalClientService,
  ) {}

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser): Promise<CreatePayPalOrderResponse> {
    const { order } = await this.payments.createPendingOrder(user.userId, dto.courseSlug, 'paypal');
    const paypalOrderId = await this.paypal.createOrder(order.amountCents, order.currency);
    await this.payments.attachProviderRef(order.id, paypalOrderId);
    return { paypalOrderId };
  }

  @Post('orders/:paypalOrderId/capture')
  async capture(
    @Param('paypalOrderId') paypalOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    const order = await this.payments.findByProviderRef('paypal', paypalOrderId);
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== user.userId) throw new ForbiddenException();
    // Already confirmed (e.g. the webhook won the race) -- PayPal capture
    // calls aren't safely repeatable, so don't call it again.
    if (order.status === 'paid') return { status: order.status };

    const capture = await this.paypal.captureOrder(paypalOrderId);
    if (capture.status !== 'COMPLETED' || capture.amountCents !== order.amountCents || capture.currency !== order.currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    const paid = await this.payments.markOrderPaid(order.id, capture);
    return { status: paid.status };
  }

  /**
   * An ordinary multi-course cart checkout (never a promo code -- the MBA
   * discount is Razorpay/INR-only; PaymentsService rejects one outright).
   */
  @Post('orders/bundle')
  async createBundleOrder(@Body() dto: PromoCourseSelectionDto, @CurrentUser() user: AuthenticatedUser): Promise<CreatePayPalOrderResponse> {
    const { orders, totalAmountCents, currency } = await this.payments.createPendingBundleOrder(user.userId, dto.courseSlugs, dto.promoCode, 'paypal');
    const paypalOrderId = await this.paypal.createOrder(totalAmountCents, currency);
    await this.payments.attachProviderRefMany(orders.map((o) => o.id), paypalOrderId);
    return { paypalOrderId };
  }

  @Post('orders/bundle/:paypalOrderId/capture')
  async captureBundle(
    @Param('paypalOrderId') paypalOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    const orders = await this.payments.findAllByProviderRef('paypal', paypalOrderId);
    if (orders.length === 0) throw new NotFoundException('Order not found.');
    if (orders.some((o) => o.userId !== user.userId)) throw new ForbiddenException();
    if (orders.every((o) => o.status === 'paid')) return { status: 'paid' };

    const capture = await this.paypal.captureOrder(paypalOrderId);
    const totalAmountCents = orders.reduce((sum, o) => sum + o.amountCents, 0);
    if (capture.status !== 'COMPLETED' || capture.amountCents !== totalAmountCents || capture.currency !== orders[0].currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    await Promise.all(orders.map((o) => this.payments.markOrderPaid(o.id, capture)));
    return { status: 'paid' };
  }
}
