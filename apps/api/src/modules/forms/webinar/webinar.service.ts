import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
import type { RegisterWebinarDto } from './dto/register-webinar.dto';

const NOTIFY_EMAIL = 'info@aiit.network';

@Injectable()
export class WebinarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Idempotent per (email, webinarSlug) -- a duplicate click re-registers nothing and sends no second notification. */
  async register(dto: RegisterWebinarDto): Promise<void> {
    const existing = await this.prisma.webinarRegistration.findUnique({
      where: { email_webinarSlug: { email: dto.email, webinarSlug: dto.webinarSlug } },
    });
    if (existing) return;

    await this.prisma.webinarRegistration.create({
      data: {
        webinarSlug: dto.webinarSlug,
        name: dto.name,
        email: dto.email,
        whatsapp: dto.whatsapp,
        region: dto.region,
        persona: dto.persona,
      },
    });

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
