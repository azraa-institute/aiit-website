import { Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Notification } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('me/notifications')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Notification[]> {
    return this.notifications.listForUser(user.userId);
  }

  @Patch(':id')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<Notification> {
    return this.notifications.markRead(user.userId, id);
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notifications.markAllRead(user.userId);
  }
}
