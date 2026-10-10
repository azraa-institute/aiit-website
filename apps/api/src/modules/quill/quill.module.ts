import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { QuillController } from './quill.controller';
import { QuillService } from './quill.service';

@Module({
  imports: [CoursesModule],
  controllers: [QuillController],
  providers: [QuillService],
})
export class QuillModule {}
