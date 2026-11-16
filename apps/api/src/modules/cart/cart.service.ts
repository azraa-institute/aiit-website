import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CartItemSummary } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrencyService, type CurrencyRequestLike } from '../../common/currency/currency.service';

/**
 * A real, server-side shopping cart (see CartItem in schema.prisma) --
 * "this user's cart" is just their CartItem rows. Paid courses only: a
 * free/subscription course self-enrolls instantly (CourseEnrollController),
 * there's nothing to "cash out" for it. Checkout itself lives in
 * PaymentsService.createPendingBundleOrder (any of the three providers --
 * the MBA promo-code discount is the only piece that's Razorpay/INR-only)
 * -- this service only owns what's sitting in the cart, not pricing or
 * payment.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
  ) {}

  async list(userId: string, request: CurrencyRequestLike): Promise<CartItemSummary[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'asc' },
      select: { course: { select: { id: true, slug: true, title: true, image: true, priceUsdCents: true } } },
    });

    const currencyCode = this.currency.resolveCurrency(request);
    return Promise.all(
      items.map(async ({ course }) => {
        const amountCents = course.priceUsdCents == null ? null : (await this.currency.convert(course.priceUsdCents, currencyCode)).amountCents;
        return { courseId: course.id, slug: course.slug, title: course.title, image: course.image, amountCents, currency: currencyCode };
      }),
    );
  }

  /** Adding a course the learner already holds (active or completed) is a conflict, not a silent no-op -- same "nothing to buy again" reasoning as EnrollmentsService's own re-enroll guard. */
  async add(userId: string, courseSlug: string): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug, status: 'published', deletedAt: null },
      select: { id: true, pricing: true },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.pricing !== 'paid') {
      throw new BadRequestException('This course doesn’t need a cart: free and subscription courses enrol instantly.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
    if (enrollment && enrollment.status !== 'cancelled') {
      throw new ConflictException('You are already enrolled in this course.');
    }

    await this.prisma.cartItem.create({ data: { userId, courseId: course.id } }).catch((err: unknown) => {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('This course is already in your cart.');
      }
      throw err;
    });
  }

  async remove(userId: string, courseId: string): Promise<void> {
    const result = await this.prisma.cartItem.deleteMany({ where: { userId, courseId } });
    if (result.count === 0) throw new NotFoundException('This course isn’t in your cart.');
  }
}
