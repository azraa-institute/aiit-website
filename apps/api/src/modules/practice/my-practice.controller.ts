import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { QuizAttemptResult, QuizDetail, QuizSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PracticeService } from './practice.service';
import { SubmitQuizAttemptDto } from './dto/practice.dto';

@Controller()
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class MyPracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get('me/practice')
  list(@CurrentUser() user: AuthenticatedUser): Promise<QuizSummary[]> {
    return this.practice.listForUser(user.userId);
  }

  @Get('practice/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<QuizDetail> {
    return this.practice.getForTaking(user.userId, id);
  }

  @Post('practice/:id/attempts')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuizAttemptDto,
  ): Promise<QuizAttemptResult> {
    return this.practice.submitAttempt(user.userId, id, dto);
  }
}
