import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import type { Response } from 'express';
import type {
  AdminAnnouncement,
  AdminComplaintDetail,
  AdminComplaintSummary,
  AnnouncementAudience,
  AttendanceReportRow,
  ComplaintStatus,
  Paginated,
} from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminReplyDto, COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, SetComplaintStatusDto } from '../support/dto/support.dto';
import { AdminComplaintsService } from './admin-complaints.service';
import { AdminAnnouncementsService } from './admin-announcements.service';
import { AdminReportsService } from './admin-reports.service';

class ListComplaintsQuery {
  @IsOptional()
  @IsIn(COMPLAINT_STATUSES)
  status?: ComplaintStatus;

  @IsOptional()
  @IsIn(COMPLAINT_CATEGORIES)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

class CreateAnnouncementBody {
  @IsIn(['all_students', 'course', 'instructors'])
  audience!: AnnouncementAudience;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  body!: string;
}

class CourseFilterQuery {
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

function csv(res: Response, filename: string, body: string): string {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  return body;
}

/** Admin: complaints inbox, announcements, attendance report and CSV exports. */
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminSupportController {
  constructor(
    private readonly complaints: AdminComplaintsService,
    private readonly announcements: AdminAnnouncementsService,
    private readonly reports: AdminReportsService,
  ) {}

  // ---- complaints ----

  @Get('complaints')
  listComplaints(@Query() query: ListComplaintsQuery): Promise<Paginated<AdminComplaintSummary>> {
    return this.complaints.list(query);
  }

  @Get('complaints/:id')
  complaint(@Param('id', ParseUUIDPipe) id: string): Promise<AdminComplaintDetail> {
    return this.complaints.detail(id);
  }

  @Post('complaints/:id/messages')
  @HttpCode(200)
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReplyDto,
  ): Promise<AdminComplaintDetail> {
    return this.complaints.reply(user.userId, id, dto.body, dto.internal === true);
  }

  @Patch('complaints/:id/status')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetComplaintStatusDto,
  ): Promise<AdminComplaintDetail> {
    return this.complaints.setStatus(user.userId, id, dto.status);
  }

  // ---- announcements ----

  @Get('announcements')
  listAnnouncements(): Promise<AdminAnnouncement[]> {
    return this.announcements.list();
  }

  @Post('announcements')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createAnnouncement(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAnnouncementBody): Promise<AdminAnnouncement> {
    return this.announcements.create(user.userId, body);
  }

  // ---- reports + exports ----

  @Get('reports/attendance')
  attendance(@Query() query: CourseFilterQuery): Promise<AttendanceReportRow[]> {
    return this.reports.attendance(query.courseId);
  }

  @Get('exports/students')
  async studentsCsv(@Res({ passthrough: true }) res: Response): Promise<string> {
    return csv(res, 'aiit-students.csv', await this.reports.studentsCsv());
  }

  @Get('exports/enrollments')
  async enrollmentsCsv(@Res({ passthrough: true }) res: Response): Promise<string> {
    return csv(res, 'aiit-enrollments.csv', await this.reports.enrollmentsCsv());
  }

  @Get('exports/attendance')
  async attendanceCsv(@Query() query: CourseFilterQuery, @Res({ passthrough: true }) res: Response): Promise<string> {
    return csv(res, 'aiit-attendance.csv', await this.reports.attendanceCsv(query.courseId));
  }
}
