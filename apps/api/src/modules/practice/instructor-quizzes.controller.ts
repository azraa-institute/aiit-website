import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { InstructorQuizDetail, InstructorQuizSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PracticeService } from './practice.service';
import { CreateQuizDto, UpdateQuizDto } from './dto/practice.dto';

/** Instructor-only quiz authoring, scoped to the courses the caller teaches (see PracticeService.assertTeaches). */
@Controller('instructor')
@UseGuards(JwtGuard, RolesGuard)
@Roles('instructor')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class InstructorQuizzesController {
  constructor(private readonly practice: PracticeService) {}

  @Get('courses/:courseId/quizzes')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<InstructorQuizSummary[]> {
    return this.practice.listForInstructor(user.userId, courseId);
  }

  @Post('courses/:courseId/quizzes')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateQuizDto,
  ): Promise<InstructorQuizDetail> {
    return this.practice.createQuiz(user.userId, courseId, dto);
  }

  @Get('quizzes/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<InstructorQuizDetail> {
    return this.practice.getQuizForEditing(user.userId, id);
  }

  @Patch('quizzes/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuizDto,
  ): Promise<InstructorQuizDetail> {
    return this.practice.updateQuiz(user.userId, id, dto);
  }

  @Delete('quizzes/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.practice.deleteQuiz(user.userId, id);
  }
}
