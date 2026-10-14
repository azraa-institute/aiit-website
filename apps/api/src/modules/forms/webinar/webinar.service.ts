import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
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

    await this.email.send({
      to: NOTIFY_EMAIL,
      subject: `New webinar registration: ${dto.name.replace(/[\r\n]+/g, ' ')}`,
      html: `
        <p><strong>Webinar:</strong> ${escapeHtml(dto.webinarSlug)}</p>
        <p><strong>Name:</strong> ${escapeHtml(dto.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(dto.email)}</p>
        ${dto.whatsapp ? `<p><strong>WhatsApp:</strong> ${escapeHtml(dto.whatsapp)}</p>` : ''}
        <p><strong>Region:</strong> ${escapeHtml(dto.region)}</p>
        <p><strong>Persona:</strong> ${escapeHtml(dto.persona)}</p>
      `,
    });
  }
}
