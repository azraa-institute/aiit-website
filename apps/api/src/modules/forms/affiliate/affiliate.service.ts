import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { escapeHtml } from '../../../common/email/escape-html';
import type { ApplyAffiliateDto } from './dto/apply-affiliate.dto';

const NOTIFY_EMAIL = 'info@aiit.network';

@Injectable()
export class AffiliateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async apply(dto: ApplyAffiliateDto): Promise<void> {
    await this.prisma.affiliateApplication.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        handle: dto.handle,
        country: dto.country,
        city: dto.city,
        referralCode: dto.referralCode,
        source: dto.source,
        intent: dto.intent,
      },
    });

    const optional = (label: string, value?: string) => (value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : '');

    await this.email.send({
      to: NOTIFY_EMAIL,
      subject: `New affiliate application: ${dto.name.replace(/[\r\n]+/g, ' ')}`,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(dto.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(dto.email)}</p>
        ${optional('Phone', dto.phone)}
        ${optional('Handle', dto.handle)}
        ${optional('Country', dto.country)}
        ${optional('City', dto.city)}
        ${optional('Referral code', dto.referralCode)}
        ${optional('Source', dto.source)}
        ${optional('Intent', dto.intent)}
      `,
    });
  }
}
