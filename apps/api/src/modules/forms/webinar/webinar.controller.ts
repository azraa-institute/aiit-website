import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import { WebinarService } from './webinar.service';
import { RegisterWebinarDto } from './dto/register-webinar.dto';

@Controller('webinar-registrations')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class WebinarController {
  constructor(
    private readonly webinar: WebinarService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() dto: RegisterWebinarDto, @Req() request: Request): Promise<void> {
    await this.turnstile.verify(dto.turnstileToken, request.ip);
    await this.webinar.register(dto);
  }
}
