import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreatePayPalOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { PayPalClientService } from './paypal-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';

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
}
