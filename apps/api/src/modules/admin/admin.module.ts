import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { WebinarsModule } from '../webinars/webinars.module';
import { PaymentsModule } from '../payments/payments.module';
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
import { AdminBlogController } from './admin-blog.controller';
import { AdminBlogService } from './admin-blog.service';
import { GithubPublisherService } from './github-publisher.service';
import { AdminWebinarsController } from './admin-webinars.controller';
import { AdminWebinarsService } from './admin-webinars.service';

@Module({
  imports: [EmailModule, EnrollmentsModule, AffiliatesModule, WebinarsModule, PaymentsModule],
  controllers: [
    AdminUsersController,
    AdminCoursesController,
    AdminSupportController,
    AdminMessagesController,
    AdminAffiliatesController,
    AdminBlogController,
    AdminWebinarsController,
  ],
  providers: [
    AdminUsersService,
    AdminCoursesService,
    AdminComplaintsService,
    AdminAnnouncementsService,
    AdminReportsService,
    AdminMessagesService,
    AdminAffiliatesService,
    AdminBlogService,
    GithubPublisherService,
    AdminWebinarsService,
  ],
})
export class AdminModule {}
