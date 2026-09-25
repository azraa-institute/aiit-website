import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import type { AdminCourse } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminCoursesService } from './admin-courses.service';

class SetCourseInstructorsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  instructorIds!: string[];
}

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminCoursesController {
  constructor(private readonly courses: AdminCoursesService) {}

  @Get('courses')
  list(): Promise<AdminCourse[]> {
    return this.courses.list();
  }

  @Put('courses/:id/instructors')
  setInstructors(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCourseInstructorsDto,
  ): Promise<AdminCourse> {
    return this.courses.setInstructors(user.userId, id, dto.instructorIds);
  }
}
