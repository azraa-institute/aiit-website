import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CreatePaystackOrderResponse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { PaystackClientService } from './paystack-client.service';
import { CreateOrderDto } from '../dto/create-order.dto';

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
    if (!user.email) throw new ConflictException('Your account has no email on file -- cannot start a Paystack payment.');
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
    if (transaction.status !== 'success' || transaction.amountCents !== order.amountCents || transaction.currency !== order.currency) {
      throw new ConflictException('This payment could not be verified.');
    }

    const paid = await this.payments.markOrderPaid(order.id, transaction);
    return { status: paid.status };
  }
}
