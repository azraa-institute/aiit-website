import { Module } from '@nestjs/common';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';
import { InstructorComplaintsController } from './instructor-complaints.controller';
import { InstructorComplaintsService } from './instructor-complaints.service';

@Module({
  controllers: [InstructorController, InstructorComplaintsController],
  providers: [InstructorService, InstructorComplaintsService],
})
export class InstructorModule {}
