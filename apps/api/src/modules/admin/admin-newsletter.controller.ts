import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AdminNewsletterIssue } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NewsletterService } from '../forms/newsletter/newsletter.service';
import { SendNewsletterDto, SendTestNewsletterDto } from './dto/admin-newsletter.dto';

/** Compose-and-send a newsletter broadcast to every confirmed (opted-in) subscriber. Sending is synchronous, so a large list can take a few seconds -- matches every other admin bulk action in this codebase (bulk certificate issuance, webinar reminders), no queue/worker exists here to hand it off to. */
@Controller('admin/newsletter')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AdminNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get('subscriber-count')
  subscriberCount(): Promise<{ count: number }> {
    return this.newsletter.countConfirmedSubscribers().then((count) => ({ count }));
  }

  @Get('issues')
  issues(): Promise<AdminNewsletterIssue[]> {
    return this.newsletter.listIssues();
  }

  @Post('send')
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendNewsletterDto): Promise<AdminNewsletterIssue> {
    return this.newsletter.sendIssue(user.userId, dto.subject, dto.bodyText);
  }

  /** Sends to one address, not the subscriber list -- the safe way to confirm delivery actually works and preview the rendered email before a real send. */
  @Post('test')
  async sendTest(@Body() dto: SendTestNewsletterDto): Promise<{ ok: true }> {
    await this.newsletter.sendTest(dto.to, dto.subject, dto.bodyText);
    return { ok: true };
  }
}
