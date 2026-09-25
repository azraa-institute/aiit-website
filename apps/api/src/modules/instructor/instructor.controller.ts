import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {
  AssignmentSubmissions,
  GradingItem,
  InstructorAnnouncement,
  InstructorAssignment,
  InstructorCourse,
  InstructorDashboard,
  RosterStudent,
} from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstructorService } from './instructor.service';
import { CreateAnnouncementDto, CreateAssignmentDto, GradeDto, UpdateAssignmentDto } from './dto/instructor.dto';

/** Instructor-only. Every route is scoped to the courses the caller has been assigned (see InstructorService). */
@Controller('instructor')
@UseGuards(JwtGuard, RolesGuard)
@Roles('instructor')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class InstructorController {
  constructor(private readonly instructor: InstructorService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser): Promise<InstructorDashboard> {
    return this.instructor.dashboard(user.userId);
  }

  @Get('courses')
  courses(@CurrentUser() user: AuthenticatedUser): Promise<InstructorCourse[]> {
    return this.instructor.courses(user.userId);
  }

  @Get('courses/:courseId/students')
  roster(@CurrentUser() user: AuthenticatedUser, @Param('courseId', ParseUUIDPipe) courseId: string): Promise<RosterStudent[]> {
    return this.instructor.roster(user.userId, courseId);
  }

  @Get('courses/:courseId/assignments')
  assignments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<InstructorAssignment[]> {
    return this.instructor.assignments(user.userId, courseId);
  }

  @Post('courses/:courseId/assignments')
  createAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<InstructorAssignment> {
    return this.instructor.createAssignment(user.userId, courseId, dto);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<InstructorAssignment> {
    return this.instructor.updateAssignment(user.userId, id, dto);
  }

  @Delete('assignments/:id')
  @HttpCode(204)
  async deleteAssignment(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.instructor.deleteAssignment(user.userId, id);
  }

  @Get('assignments/:id/submissions')
  submissions(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<AssignmentSubmissions> {
    return this.instructor.submissions(user.userId, id);
  }

  @Patch('submissions/:id/grade')
  grade(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeDto) {
    return this.instructor.grade(user.userId, id, dto);
  }

  @Get('submissions/:id/file')
  fileLink(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.instructor.fileLink(user.userId, id);
  }

  @Get('grading')
  grading(@CurrentUser() user: AuthenticatedUser): Promise<GradingItem[]> {
    return this.instructor.gradingQueue(user.userId);
  }

  @Get('notices')
  notices(): Promise<InstructorAnnouncement[]> {
    return this.instructor.notices();
  }

  @Get('courses/:courseId/announcements')
  announcements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<InstructorAnnouncement[]> {
    return this.instructor.announcements(user.userId, courseId);
  }

  @Post('courses/:courseId/announcements')
  @HttpCode(201)
  createAnnouncement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<InstructorAnnouncement> {
    return this.instructor.createAnnouncement(user.userId, courseId, dto);
  }
}
