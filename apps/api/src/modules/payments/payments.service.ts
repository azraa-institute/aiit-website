import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Order, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

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
}
