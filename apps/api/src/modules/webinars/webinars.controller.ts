import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PublicWebinar } from '@aiit/shared';
import { WebinarsService } from './webinars.service';

@Controller('webinars')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class WebinarsController {
  constructor(private readonly webinars: WebinarsService) {}

  @Get()
  list(): Promise<PublicWebinar[]> {
    return this.webinars.list();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<PublicWebinar> {
    return this.webinars.getBySlug(slug);
  }
}
