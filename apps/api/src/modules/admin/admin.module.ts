import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { AdminSupportController } from './admin-support.controller';
import { AdminComplaintsService } from './admin-complaints.service';
import { AdminAnnouncementsService } from './admin-announcements.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminMessagesController } from './admin-messages.controller';
import { AdminMessagesService } from './admin-messages.service';

@Module({
  controllers: [AdminUsersController, AdminCoursesController, AdminSupportController, AdminMessagesController],
  providers: [
    AdminUsersService,
    AdminCoursesService,
    AdminComplaintsService,
    AdminAnnouncementsService,
    AdminReportsService,
    AdminMessagesService,
  ],
})
export class AdminModule {}
