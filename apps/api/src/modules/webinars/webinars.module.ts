import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { WebinarsController } from './webinars.controller';
import { MyWebinarsController } from './my-webinars.controller';
import { WebinarsService } from './webinars.service';
import { WebinarNotificationsService } from './webinar-notifications.service';
import { WebinarReminderCronService } from './webinar-reminder-cron.service';

@Module({
  imports: [EmailModule],
  controllers: [WebinarsController, MyWebinarsController],
  providers: [WebinarsService, WebinarNotificationsService, WebinarReminderCronService],
  exports: [WebinarsService, WebinarNotificationsService],
})
export class WebinarsModule {}
