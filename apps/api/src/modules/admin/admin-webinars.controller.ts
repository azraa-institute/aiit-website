import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AdminWebinar, AdminWebinarRegistrant, AdminWebinarSummary, WebinarReminderResult } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminWebinarsService } from './admin-webinars.service';
import { SendWebinarReminderDto, WebinarInputDto } from './dto/admin-webinar.dto';

@Controller('admin/webinars')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminWebinarsController {
  constructor(private readonly webinars: AdminWebinarsService) {}

  @Get()
  list(): Promise<AdminWebinarSummary[]> {
    return this.webinars.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminWebinar> {
    return this.webinars.get(id);
  }

  @Post()
  create(@Body() dto: WebinarInputDto): Promise<AdminWebinar> {
    return this.webinars.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WebinarInputDto): Promise<AdminWebinar> {
    return this.webinars.update(id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ ok: true }> {
    await this.webinars.remove(user.userId, id);
    return { ok: true };
  }

  @Get(':id/registrations')
  registrants(@Param('id', ParseUUIDPipe) id: string): Promise<AdminWebinarRegistrant[]> {
    return this.webinars.registrants(id);
  }

  @Patch('registrations/:registrationId/attended')
  markAttended(
    @CurrentUser() user: AuthenticatedUser,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body('attended') attended: boolean,
  ): Promise<void> {
    return this.webinars.markAttended(user.userId, registrationId, Boolean(attended));
  }

  @Post(':id/send-reminder')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendReminder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendWebinarReminderDto,
  ): Promise<WebinarReminderResult> {
    return this.webinars.sendReminderNow(user.userId, id, dto.kind);
  }
}
