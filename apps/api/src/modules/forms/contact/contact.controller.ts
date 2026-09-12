import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Controller('contact')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class ContactController {
  constructor(
    private readonly contact: ContactService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(@Body() dto: CreateContactMessageDto, @Req() request: Request): Promise<void> {
    await this.turnstile.verify(dto.turnstileToken, request.ip);
    await this.contact.create(dto);
  }
}
