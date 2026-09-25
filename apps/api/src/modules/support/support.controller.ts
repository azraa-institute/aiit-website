import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { ComplaintDetail, ComplaintOptions, ComplaintSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { ComplaintMessageDto, CreateComplaintDto } from './dto/support.dto';

/** A student's own reports. Staff have their own (admin) endpoints; instructors have none. */
@Controller('me/complaints')
@UseGuards(JwtGuard, RolesGuard)
@Roles('learner')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('options')
  options(@CurrentUser() user: AuthenticatedUser): Promise<ComplaintOptions> {
    return this.support.options(user.userId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ComplaintSummary[]> {
    return this.support.list(user.userId);
  }

  /** Filing is rate-limited (5 an hour) so the admin inbox can't be flooded. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComplaintDto): Promise<ComplaintSummary> {
    return this.support.create(user.userId, dto);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<ComplaintDetail> {
    return this.support.detail(user.userId, id);
  }

  @Post(':id/messages')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComplaintMessageDto,
  ): Promise<ComplaintDetail> {
    return this.support.reply(user.userId, id, dto.body);
  }
}
