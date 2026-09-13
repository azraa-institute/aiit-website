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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe7;padding:40px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid rgba(20,17,15,0.12);border-radius:8px;">
                <tr>
                  <td style="padding:36px 40px 24px;text-align:center;">
                    <img
                      src="https://www.aiit.network/assets/brand/azraa-institute-of-information-technology-official-logo-black.png"
                      alt="AIIT — Azraa Institute of Information Technology"
                      width="160"
                      style="display:block;margin:0 auto;border:0;max-width:160px;height:auto;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px;">
                    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#14110f;font-weight:normal;text-align:center;">
                      Confirm your subscription
                    </h1>
                    <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14110f;text-align:center;">
                      Click the button below to confirm your subscription to the AIIT newsletter.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 32px;text-align:center;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="border-radius:6px;background-color:#9a7b4f;">
                          <a
                            href="${url}"
                            style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#f4efe7;text-decoration:none;border-radius:6px;"
                          >
                            Confirm subscription
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 36px;">
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#55504a;text-align:center;">
                      Button not working? Paste this link into your browser:
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#9a7b4f;text-align:center;word-break:break-all;">
                      <a href="${url}" style="color:#9a7b4f;">${url}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid rgba(20,17,15,0.1);">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:#8a837a;text-align:center;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a837a;">
                AIIT — Azraa Institute of Information Technology · aiit.network
              </p>
            </td>
          </tr>
        </table>
      `,
    });
  }
}
