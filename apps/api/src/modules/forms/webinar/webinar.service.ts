import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
import { brandedEmailHtml, fieldListHtml } from '../../../common/email/branded-email';
import { WebinarNotificationsService } from '../../webinars/webinar-notifications.service';
import type { RegisterWebinarDto } from './dto/register-webinar.dto';

const NOTIFY_EMAIL = 'info@aiit.network';

@Injectable()
export class WebinarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: WebinarNotificationsService,
  ) {}

  /** Idempotent per (email, webinarSlug) -- a duplicate click re-registers nothing and sends no second notification. */
  async register(dto: RegisterWebinarDto): Promise<void> {
    const existing = await this.prisma.webinarRegistration.findUnique({
      where: { email_webinarSlug: { email: dto.email, webinarSlug: dto.webinarSlug } },
    });
    if (existing) return;

    // Null if this slug doesn't match a real Webinar row (shouldn't happen
    // from the live form, which only ever submits the real featured
    // webinar's slug) -- the registration still saves either way, it just
    // won't get a confirmation email or show up on /me/webinars without a
    // webinar to resolve against.
    const webinar = await this.prisma.webinar.findUnique({ where: { slug: dto.webinarSlug } });

    const registration = await this.prisma.webinarRegistration.create({
      data: {
        webinarSlug: dto.webinarSlug,
        webinarId: webinar?.id,
        name: dto.name,
        email: dto.email,
        whatsapp: dto.whatsapp,
        region: dto.region,
        persona: dto.persona,
      },
    });

    if (webinar) await this.notifications.sendConfirmation(registration, webinar);

    const adminUrl = webinar
      ? `${process.env.APP_URL ?? 'https://aiit.network'}/admin/webinars/${webinar.id}/registrants`
      : `${process.env.APP_URL ?? 'https://aiit.network'}/admin/webinars`;

    await this.email.send({
      to: NOTIFY_EMAIL,
      subject: `New webinar registration: ${dto.name.replace(/[\r\n]+/g, ' ')}`,
      html: brandedEmailHtml({
        heading: 'New webinar registration',
        intro: `${escapeHtml(dto.name)} just registered for a webinar.`,
        bodyHtml: fieldListHtml([
          { label: 'Webinar', value: escapeHtml(dto.webinarSlug) },
          { label: 'Name', value: escapeHtml(dto.name) },
          { label: 'Email', value: escapeHtml(dto.email) },
          ...(dto.whatsapp ? [{ label: 'WhatsApp', value: escapeHtml(dto.whatsapp) }] : []),
          { label: 'Region', value: escapeHtml(dto.region) },
          { label: 'Persona', value: escapeHtml(dto.persona) },
        ]),
        ctaLabel: 'View registrants',
        ctaUrl: adminUrl,
        footerNote: 'Automated notification from the AIIT website -- new webinar registration.',
      }),
    });
  }
}
