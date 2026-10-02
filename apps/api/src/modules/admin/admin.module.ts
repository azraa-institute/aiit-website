import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
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
import { AdminAffiliatesController } from './admin-affiliates.controller';
import { AdminAffiliatesService } from './admin-affiliates.service';

@Module({
  imports: [EmailModule],
  controllers: [AdminUsersController, AdminCoursesController, AdminSupportController, AdminMessagesController, AdminAffiliatesController],
  providers: [
    AdminUsersService,
    AdminCoursesService,
    AdminComplaintsService,
    AdminAnnouncementsService,
    AdminReportsService,
    AdminMessagesService,
    AdminAffiliatesService,
  ],
})
export class AdminModule {}
