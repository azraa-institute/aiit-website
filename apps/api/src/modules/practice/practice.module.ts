import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { PracticeService } from './practice.service';
import { MyPracticeController } from './my-practice.controller';
import { InstructorQuizzesController } from './instructor-quizzes.controller';

@Module({
  imports: [EnrollmentsModule],
  controllers: [MyPracticeController, InstructorQuizzesController],
  providers: [PracticeService],
})
export class PracticeModule {}
