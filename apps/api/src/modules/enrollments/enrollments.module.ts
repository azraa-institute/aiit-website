import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { MyEnrollmentsController } from './my-enrollments.controller';
import { CourseEnrollController } from './course-enroll.controller';

@Module({
  controllers: [MyEnrollmentsController, CourseEnrollController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
