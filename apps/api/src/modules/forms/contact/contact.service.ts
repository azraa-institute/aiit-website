import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
import { brandedEmailHtml, fieldListHtml } from '../../../common/email/branded-email';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';

const NOTIFY_EMAIL = 'info@aiit.network';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateContactMessageDto): Promise<void> {
    await this.prisma.contactMessage.create({
      data: { name: dto.name, email: dto.email, topic: dto.topic, message: dto.message },
    });

    await this.email.send({
      to: NOTIFY_EMAIL,
      subject: `New contact message from ${dto.name.replace(/[\r\n]+/g, ' ')}`,
      html: brandedEmailHtml({
        heading: 'New contact message',
        intro: `${escapeHtml(dto.name)} sent a message through the Contact page.`,
        bodyHtml:
          fieldListHtml([
            { label: 'From', value: `${escapeHtml(dto.name)} (${escapeHtml(dto.email)})` },
            { label: 'Topic', value: escapeHtml(dto.topic) },
          ]) +
          `<p style="margin:16px 0 0;padding:14px;border:1px solid rgba(20,17,15,0.1);border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#14110f;white-space:pre-wrap;">${escapeHtml(dto.message)}</p>`,
        ctaLabel: 'View in admin',
        ctaUrl: `${process.env.APP_URL ?? 'https://aiit.network'}/admin/messages`,
        footerNote: 'Automated notification from the AIIT website -- new contact message.',
      }),
    });
  }
}
