import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsService } from './assignments.service';
import { MyAssignmentsController } from './my-assignments.controller';
import { AssignmentSubmissionsController } from './assignment-submissions.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule],
  controllers: [MyAssignmentsController, AssignmentSubmissionsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
