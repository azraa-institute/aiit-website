import { Body, Controller, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Assignment } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

/** Matches the previous client-side SUBMISSION_UPLOAD_CONSTRAINTS in AssignmentRow.tsx. */
const SUBMISSION_MAX_BYTES = 25 * 1024 * 1024;

@Controller('assignments')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AssignmentSubmissionsController {
  constructor(private readonly assignments: AssignmentsService) {}

  /**
   * The file (if any) rides along in the same multipart request and is
   * uploaded server-side via the service-role client -- see
   * SupabaseAdminService.uploadToStorage's doc comment for why direct
   * browser-to-Storage uploads don't work for this project. memoryStorage
   * (not the default diskStorage) so @UploadedFile() gives a real
   * in-memory Buffer, forwarded straight to Storage without touching disk.
   */
  @Post(':id/submissions')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: SUBMISSION_MAX_BYTES } }))
  submit(
    @Param('id') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Assignment> {
    return this.assignments.submit(user.userId, assignmentId, dto, file);
  }

  /** Not learner-callable. No admin UI yet -- called directly with an admin JWT until one exists. */
  @Patch(':id/submissions/:submissionId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  grade(@Param('submissionId') submissionId: string, @Body() dto: GradeSubmissionDto) {
    return this.assignments.grade(submissionId, dto);
  }
}
