import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';

@Module({
  controllers: [AdminUsersController, AdminCoursesController],
  providers: [AdminUsersService, AdminCoursesService],
})
export class AdminModule {}
