import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { LogConsentDto } from './dto/log-consent.dto';

interface LogContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Append-only: every call is a new row, never an update -- see the
 * CookieConsentLog model's own comment in schema.prisma for why. */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: LogConsentDto, ctx: LogContext): Promise<void> {
    await this.prisma.cookieConsentLog.create({
      data: {
        visitorId: dto.visitorId,
        analytics: dto.analytics,
        preferences: dto.preferences,
        userId: ctx.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  }
}
