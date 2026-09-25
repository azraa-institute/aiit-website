import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AdminLiveClass, Timetable } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminLiveClassesService } from './admin-live-classes.service';
import {
  CreateLiveClassDto,
  CreateTimetableDto,
  UpdateLiveClassDto,
  UpdateTimetableDto,
} from './dto/live-class.dto';

/** Admin-only scheduling: timetables, generated classes, one-off classes, instructors, attendance. */
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminLiveClassesController {
  constructor(private readonly admin: AdminLiveClassesService) {}

  @Get('timetables')
  timetables(@Query('courseId') courseId?: string): Promise<Timetable[]> {
    return this.admin.listTimetables(courseId);
  }

  @Post('timetables')
  createTimetable(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTimetableDto): Promise<Timetable> {
    return this.admin.createTimetable(user.userId, dto);
  }

  @Patch('timetables/:id')
  updateTimetable(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTimetableDto): Promise<Timetable> {
    return this.admin.updateTimetable(id, dto);
  }

  @Delete('timetables/:id')
  @HttpCode(204)
  async deleteTimetable(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.admin.deleteTimetable(id);
  }

  @Post('timetables/:id/generate')
  @HttpCode(200)
  generate(@Param('id', ParseUUIDPipe) id: string): Promise<{ created: number; skipped: number }> {
    return this.admin.generateClasses(id);
  }

  @Get('live-classes')
  classes(@Query('courseId') courseId?: string): Promise<AdminLiveClass[]> {
    return this.admin.listClasses(courseId);
  }

  @Post('live-classes')
  createClass(@Body() dto: CreateLiveClassDto): Promise<AdminLiveClass> {
    return this.admin.createClass(dto);
  }

  @Patch('live-classes/:id')
  updateClass(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLiveClassDto): Promise<AdminLiveClass> {
    return this.admin.updateClass(id, dto);
  }

  @Get('live-classes/:id/attendance')
  attendance(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.attendance(id);
  }
}
