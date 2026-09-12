import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Assignment } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Controller('assignments')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AssignmentSubmissionsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post(':id/submissions')
  submit(
    @Param('id') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Assignment> {
    return this.assignments.submit(user.userId, assignmentId, dto);
  }

  /** Not learner-callable. No admin UI yet -- called directly with an admin JWT until one exists. */
  @Patch(':id/submissions/:submissionId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  grade(@Param('submissionId') submissionId: string, @Body() dto: GradeSubmissionDto) {
    return this.assignments.grade(submissionId, dto);
  }
}
