import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnrollmentsService } from './enrollments.service';
import { MyEnrollmentsController } from './my-enrollments.controller';
import { CourseEnrollController } from './course-enroll.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [MyEnrollmentsController, CourseEnrollController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
