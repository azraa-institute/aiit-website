import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
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
      html: `
        <p><strong>From:</strong> ${escapeHtml(dto.name)} (${escapeHtml(dto.email)})</p>
        <p><strong>Topic:</strong> ${escapeHtml(dto.topic)}</p>
        <p>${escapeHtml(dto.message).replace(/\n/g, '<br>')}</p>
      `,
    });
  }
}
