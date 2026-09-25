import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { AdminSupportController } from './admin-support.controller';
import { AdminComplaintsService } from './admin-complaints.service';
import { AdminAnnouncementsService } from './admin-announcements.service';
import { AdminReportsService } from './admin-reports.service';

@Module({
  controllers: [AdminUsersController, AdminCoursesController, AdminSupportController],
  providers: [
    AdminUsersService,
    AdminCoursesService,
    AdminComplaintsService,
    AdminAnnouncementsService,
    AdminReportsService,
  ],
})
export class AdminModule {}
