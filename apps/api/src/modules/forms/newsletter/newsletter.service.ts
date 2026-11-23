import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminNewsletterIssue } from '@aiit/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { brandedEmailHtml } from '../../../common/email/branded-email';
import { escapeHtml } from '../../../common/email/escape-html';
import type { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

function webOrigin(): string {
  return process.env.APP_URL ?? 'https://aiit.network';
}

function toIssue(row: { id: string; subject: string; bodyText: string; sentAt: Date | null; sentCount: number; createdAt: Date }): AdminNewsletterIssue {
  return {
    id: row.id,
    subject: row.subject,
    bodyText: row.bodyText,
    sentAt: row.sentAt?.toISOString() ?? null,
    sentCount: row.sentCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** One paragraph per non-empty line, escaped -- the plain-text compose box's only formatting. */
function paragraphize(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 16px;">${escapeHtml(line)}</p>`)
    .join('');
}

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

  /** @Roles('admin') at the controller. How many people a broadcast would actually reach -- shown on the compose page before sending. */
  async countConfirmedSubscribers(): Promise<number> {
    return this.prisma.newsletterSubscriber.count({ where: { status: 'confirmed' } });
  }

  /** @Roles('admin') at the controller. Most recent first. */
  async listIssues(): Promise<AdminNewsletterIssue[]> {
    const rows = await this.prisma.newsletterIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(toIssue);
  }

  /**
   * @Roles('admin') at the controller. Sends directly via EmailService/Resend
   * to every confirmed subscriber, one at a time -- the same fan-out shape
   * WebinarNotificationsService.sendReminders already uses for many
   * recipients, not a Brevo campaign (no second vendor dependency for the
   * one newsletter feature this codebase actually has). One recipient's
   * send failing (bounced address, transient provider error) doesn't stop
   * the rest -- sentCount reflects only the ones that actually went out.
   * Synchronous, matching every other admin bulk action in this codebase
   * (bulk certificate issuance, webinar reminders) -- no queue/worker
   * exists here to hand this off to.
   */
  async sendIssue(adminId: string, subject: string, bodyText: string): Promise<AdminNewsletterIssue> {
    const trimmedSubject = subject.trim();
    const trimmedBody = bodyText.trim();
    if (!trimmedSubject || !trimmedBody) throw new BadRequestException('Subject and body are both required.');

    const issue = await this.prisma.newsletterIssue.create({
      data: { subject: trimmedSubject, bodyText: trimmedBody, createdBy: adminId },
    });
    const sent = await this.broadcast(trimmedSubject, paragraphize(trimmedBody), webOrigin(), 'Visit AIIT');
    const updated = await this.prisma.newsletterIssue.update({
      where: { id: issue.id },
      data: { sentAt: new Date(), sentCount: sent },
    });
    return toIssue(updated);
  }

  /**
   * @Roles('admin') at the controller. Sends the exact same composed email
   * to a single address, not the subscriber list, and never touches
   * `NewsletterIssue` -- the safe way to confirm the send pipeline actually
   * delivers (and to preview the rendered email) before committing to a
   * real broadcast. `[Test]` prefix and a distinct footer note make it
   * unmistakable this isn't a real issue if it's ever found in an inbox
   * later.
   */
  async sendTest(to: string, subject: string, bodyText: string): Promise<void> {
    const trimmedSubject = subject.trim();
    const trimmedBody = bodyText.trim();
    if (!trimmedSubject || !trimmedBody) throw new BadRequestException('Subject and body are both required.');

    await this.email.send({
      to,
      subject: `[Test] ${trimmedSubject}`,
      html: brandedEmailHtml({
        heading: trimmedSubject,
        intro: '',
        bodyHtml: paragraphize(trimmedBody),
        ctaLabel: 'Visit AIIT',
        ctaUrl: webOrigin(),
        footerNote: "This is a test send from the AIIT admin newsletter page: it wasn't sent to your subscriber list.",
      }),
    });
  }

  /**
   * @Roles('admin') at the controller, called from AdminBlogService once an
   * admin explicitly asks to notify subscribers about an already-published
   * post (opt-in per post, not automatic on every publish -- a draft fix or
   * minor edit shouldn't email anyone). Reuses the same broadcast path and
   * NewsletterIssue history as a manually-composed issue.
   */
  async notifyNewPost(adminId: string, post: { title: string; excerpt: string; slug: string }): Promise<AdminNewsletterIssue> {
    const subject = `New on the AIIT blog: ${post.title}`;
    const issue = await this.prisma.newsletterIssue.create({
      data: { subject, bodyText: post.excerpt, createdBy: adminId },
    });
    const bodyHtml = `<p style="margin:0 0 16px;">${escapeHtml(post.excerpt)}</p>`;
    const sent = await this.broadcast(subject, bodyHtml, `${webOrigin()}/resources/${post.slug}`, 'Read the full post');
    const updated = await this.prisma.newsletterIssue.update({
      where: { id: issue.id },
      data: { sentAt: new Date(), sentCount: sent },
    });
    return toIssue(updated);
  }

  /**
   * Sends directly via EmailService/Resend to every confirmed subscriber,
   * one at a time -- the same fan-out shape
   * WebinarNotificationsService.sendReminders already uses for many
   * recipients, not a Brevo campaign (no second vendor dependency for the
   * one newsletter feature this codebase actually has). One recipient's
   * send failing (bounced address, transient provider error) doesn't stop
   * the rest -- the returned count reflects only the ones that actually
   * went out. Synchronous, matching every other admin bulk action in this
   * codebase (bulk certificate issuance, webinar reminders) -- no queue/
   * worker exists here to hand this off to.
   */
  private async broadcast(subject: string, bodyHtml: string, ctaUrl: string, ctaLabel: string): Promise<number> {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'confirmed' },
      select: { email: true, unsubscribeToken: true },
    });

    let sent = 0;
    for (const subscriber of subscribers) {
      try {
        await this.email.send({
          to: subscriber.email,
          subject,
          html: brandedEmailHtml({
            heading: subject,
            intro: '',
            bodyHtml,
            ctaLabel,
            ctaUrl,
            footerNote: `You're receiving this because you subscribed to the AIIT newsletter. <a href="${webOrigin()}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}">Unsubscribe</a>.`,
          }),
        });
        sent += 1;
      } catch {
        // Best-effort, same as webinar reminders -- one bad address never blocks the rest of the send.
      }
    }
    return sent;
  }

  private async sendConfirmEmail(email: string, token: string): Promise<void> {
    const url = `${process.env.APP_URL ?? 'https://aiit.network'}/newsletter/confirm?token=${token}`;
    await this.email.send({
      to: email,
      subject: 'Confirm your AIIT newsletter subscription',
      html: brandedEmailHtml({
        heading: 'Confirm your subscription',
        intro: 'Click the button below to confirm your subscription to the AIIT newsletter.',
        ctaLabel: 'Confirm subscription',
        ctaUrl: url,
        footerNote: "If you didn't request this, you can safely ignore this email.",
      }),
    });
  }
}
