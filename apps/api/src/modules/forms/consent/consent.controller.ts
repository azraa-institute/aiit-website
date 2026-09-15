import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ConsentService } from './consent.service';
import { LogConsentDto } from './dto/log-consent.dto';

@Controller('consent')
export class ConsentController {
  constructor(
    private readonly consent: ConsentService,
    private readonly jwt: JwtGuard,
  ) {}

  /**
   * Fire-and-forget from the frontend's CookieConsentContext -- logged
   * best-effort (see ConsentService), never blocking the UI on this
   * request. No Turnstile here unlike the other public forms in this
   * module: this fires silently on every accept/decline, not from a
   * user-facing form a bot would target, and a challenge widget has no
   * natural place in that flow.
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async log(@Body() dto: LogConsentDto, @Req() request: Request): Promise<void> {
    const user = await this.jwt.tryIdentify(request);
    const userAgentHeader = request.headers['user-agent'];

    await this.consent.log(dto, {
      userId: user?.userId,
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
    });
  }
}
