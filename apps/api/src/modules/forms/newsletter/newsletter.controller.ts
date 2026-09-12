import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterTokenDto } from './dto/newsletter-token.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly newsletter: NewsletterService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async subscribe(@Body() dto: SubscribeNewsletterDto, @Req() request: Request): Promise<void> {
    await this.turnstile.verify(dto.turnstileToken, request.ip);
    await this.newsletter.subscribe(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(@Body() dto: NewsletterTokenDto): Promise<void> {
    return this.newsletter.confirm(dto.token);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  unsubscribe(@Body() dto: NewsletterTokenDto): Promise<void> {
    return this.newsletter.unsubscribe(dto.token);
  }
}
