import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Order, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { PayPalClientService } from './paypal/paypal-client.service';
import { RazorpayClientService } from './razorpay/razorpay-client.service';
import { PaystackClientService } from './paystack/paystack-client.service';

/**
 * Provider-agnostic order bookkeeping. A provider-specific client (e.g.
 * PaypalClientService) talks to the actual payment API; this service owns
 * the `Order` row and the hand-off into enrollment once a payment is
 * confirmed, so every provider shares the exact same correctness guarantees.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly currency: CurrencyService,
    private readonly paypal: PayPalClientService,
    private readonly razorpay: RazorpayClientService,
    private readonly paystack: PaystackClientService,
  ) {}

  /**
   * Looks up the course itself and snapshots its price -- never trusts an
   * amount supplied by the client. 404s if the course doesn't exist (or
   * isn't published), throws if it isn't a one-time-paid course.
   *
   * `currency` defaults to 'USD' (the course's own canonical
   * `priceUsdCents`, used as-is -- PayPal's path). A non-USD currency (e.g.
   * Razorpay's 'INR') is resolved fresh via `CurrencyService.convert()`
   * right here, not reused from whatever price the page happened to render
   * earlier -- same "never trust a stale/precomputed amount" reasoning as
   * not trusting the client.
   */
  async createPendingOrder(
    userId: string,
    courseSlug: string,
    provider: PaymentProvider,
    currency = 'USD',
  ): Promise<{ order: Order; courseTitle: string }> {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug, status: 'published', deletedAt: null },
      select: { id: true, title: true, pricing: true, priceUsdCents: true },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.pricing !== 'paid' || course.priceUsdCents == null) {
      throw new ConflictException('This course is not available for one-time purchase.');
    }

    const amountCents =
      currency === 'USD' ? course.priceUsdCents : (await this.currency.convert(course.priceUsdCents, currency)).amountCents;

    const order = await this.prisma.order.create({
      data: {
        userId,
        courseId: course.id,
        provider,
        currency,
        amountCents,
      },
    });
    return { order, courseTitle: course.title };
  }

  async attachProviderRef(orderId: string, providerRef: string): Promise<void> {
    await this.prisma.order.update({ where: { id: orderId }, data: { providerRef } });
  }

  async findByProviderRef(provider: PaymentProvider, providerRef: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { provider_providerRef: { provider, providerRef } } });
  }

  /**
   * Idempotent: only the caller that actually flips pending -> paid goes on
   * to enroll + notify. Both the synchronous capture call (frontend
   * onApprove) and the provider's webhook can legitimately race to confirm
   * the same payment -- whichever wins the conditional update does the
   * work, the other is a no-op that still returns the now-paid order.
   */
  async markOrderPaid(orderId: string, rawPayload?: unknown): Promise<Order> {
    const result = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'pending' },
      data: { status: 'paid', paidAt: new Date(), rawPayload: rawPayload as Prisma.InputJsonValue },
    });

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (result.count === 0) return order;

    try {
      const enrollment = await this.enrollments.enrollAfterPayment(order.userId, order.courseId);
      await this.notifications.create(
        order.userId,
        'course',
        `Payment received -- you're enrolled in ${enrollment.course.title}`,
        undefined,
        `/courses/${enrollment.course.slug}`,
      );
    } catch (err) {
      // A second, separate paid Order for a course the learner is already
      // actively enrolled in (e.g. a genuine double purchase) -- the
      // payment still succeeded and the order is correctly marked paid,
      // there's just nothing new to grant.
      if (err instanceof ConflictException) {
        this.logger.warn(`Order ${order.id} paid, but learner ${order.userId} was already enrolled in course ${order.courseId}.`);
      } else {
        throw err;
      }
    }

    await this.audit.record(order.userId, 'order.paid', 'order', order.id, {
      provider: order.provider,
      amountCents: order.amountCents,
      currency: order.currency,
    });
    return order;
  }

  /**
   * Full refund only (Phase 1), admin-triggered -- no self-service
   * refunds, no partial amounts. Each provider needs a different id to
   * refund against (PayPal/Razorpay: a capture/payment id looked up fresh
   * from providerRef, which only ever stored the order id; Paystack: the
   * transaction reference, which already *is* providerRef) -- see each
   * client service's own refund method for why. `refundedAt`/`refundRef`
   * are only ever written after the provider's refund call actually
   * succeeds, same "never optimistic" convention as Certificate.revokedAt.
   */
  async refundOrder(adminId: string, orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.status !== 'paid') throw new ConflictException('Only a paid order can be refunded.');
    if (!order.providerRef) throw new ConflictException('This order has no provider reference to refund against.');

    const refundRef = await this.callProviderRefund(order.provider, order.providerRef);

    const refunded = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'refunded', refundedAt: new Date(), refundRef },
    });
    await this.audit.record(adminId, 'order.refund', 'order', orderId, {
      provider: order.provider,
      amountCents: order.amountCents,
      currency: order.currency,
      refundRef,
    });
    return refunded;
  }

  private async callProviderRefund(provider: PaymentProvider, providerRef: string): Promise<string> {
    if (provider === 'paypal') {
      const captureId = await this.paypal.getCaptureId(providerRef);
      if (!captureId) throw new ConflictException('Could not find a PayPal capture to refund for this order.');
      return (await this.paypal.refundCapture(captureId)).refundId;
    }
    if (provider === 'razorpay') {
      const paymentId = await this.razorpay.findCapturedPaymentId(providerRef);
      if (!paymentId) throw new ConflictException('Could not find a captured Razorpay payment to refund for this order.');
      return (await this.razorpay.refundPayment(paymentId)).refundId;
    }
    return (await this.paystack.refundTransaction(providerRef)).refundId;
  }
}
