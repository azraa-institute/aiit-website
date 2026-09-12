import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import type { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

/**
 * Double opt-in: a new signup is stored `pending` with a confirm link sent
 * immediately; the subscription only becomes real once that link is
 * clicked. Re-submitting the same email is never an error to the caller --
 * pending re-sends the same confirm link, confirmed is a silent no-op,
 * unsubscribed re-opts-in with a fresh token -- so the frontend can always
 * show one honest "check your inbox" message without leaking which case it
 * was (matches how real newsletter tools behave; this isn't the same kind
 * of identity boundary as account sign-up).
 */
@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async subscribe(dto: SubscribeNewsletterDto): Promise<void> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: dto.email } });

    if (!existing) {
      const confirmToken = randomUUID();
      await this.prisma.newsletterSubscriber.create({
        data: { email: dto.email, confirmToken, unsubscribeToken: randomUUID() },
      });
      await this.sendConfirmEmail(dto.email, confirmToken);
      return;
    }

    if (existing.status === 'confirmed') return;

    if (existing.status === 'unsubscribed') {
      const confirmToken = randomUUID();
      await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { status: 'pending', confirmToken, confirmedAt: null, unsubscribedAt: null },
      });
      await this.sendConfirmEmail(dto.email, confirmToken);
      return;
    }

    // pending -- resend the existing link rather than mint a new one on every repeat click.
    await this.sendConfirmEmail(dto.email, existing.confirmToken);
  }

  async confirm(token: string): Promise<void> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });
    if (!subscriber) throw new NotFoundException('Invalid or expired confirmation link.');
    if (subscriber.status === 'confirmed') return;

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });
  }

  async unsubscribe(token: string): Promise<void> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) throw new NotFoundException('Invalid unsubscribe link.');
    if (subscriber.status === 'unsubscribed') return;

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'unsubscribed', unsubscribedAt: new Date() },
    });
  }

  private async sendConfirmEmail(email: string, token: string): Promise<void> {
    const url = `${process.env.APP_URL ?? 'https://aiit.network'}/newsletter/confirm?token=${token}`;
    await this.email.send({
      to: email,
      subject: 'Confirm your AIIT newsletter subscription',
      html: `
        <p>Confirm your subscription to the AIIT newsletter:</p>
        <p><a href="${url}">${url}</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  }
}
