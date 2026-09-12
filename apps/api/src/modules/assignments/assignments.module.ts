import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AssignmentsService } from './assignments.service';
import { MyAssignmentsController } from './my-assignments.controller';
import { AssignmentSubmissionsController } from './assignment-submissions.controller';

@Module({
  imports: [EnrollmentsModule],
  controllers: [MyAssignmentsController, AssignmentSubmissionsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
