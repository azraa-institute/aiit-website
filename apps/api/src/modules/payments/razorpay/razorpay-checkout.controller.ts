import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreateRazorpayOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { RazorpayClientService } from './razorpay-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { VerifyRazorpayPaymentDto } from '../dto/verify-razorpay-payment.dto';

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
    if (payment.status !== 'captured' || payment.amountCents !== order.amountCents || payment.currency !== order.currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    const paid = await this.payments.markOrderPaid(order.id, payment);
    return { status: paid.status };
  }
}
