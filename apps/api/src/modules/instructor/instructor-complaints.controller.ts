import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { InstructorComplaintDetail, InstructorComplaintOptions, InstructorComplaintSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplaintMessageDto } from '../support/dto/support.dto';
import { CreateInstructorComplaintDto } from './dto/instructor-complaints.dto';
import { InstructorComplaintsService } from './instructor-complaints.service';

/** An instructor's own reports about a student. Admins have their own view of the same records; other instructors never see these. */
@Controller('instructor/complaints')
@UseGuards(JwtGuard, RolesGuard)
@Roles('instructor')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class InstructorComplaintsController {
  constructor(private readonly complaints: InstructorComplaintsService) {}

  @Get('options')
  options(@CurrentUser() user: AuthenticatedUser): Promise<InstructorComplaintOptions> {
    return this.complaints.options(user.userId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<InstructorComplaintSummary[]> {
    return this.complaints.list(user.userId);
  }

  /** Filing is rate-limited (5 an hour) so the admin inbox can't be flooded. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInstructorComplaintDto): Promise<InstructorComplaintSummary> {
    return this.complaints.create(user.userId, dto);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<InstructorComplaintDetail> {
    return this.complaints.detail(user.userId, id);
  }

  @Post(':id/messages')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComplaintMessageDto,
  ): Promise<InstructorComplaintDetail> {
    return this.complaints.reply(user.userId, id, dto.body);
  }
}
