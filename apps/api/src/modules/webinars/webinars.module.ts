import { Module } from '@nestjs/common';
import { WebinarsController } from './webinars.controller';
import { MyWebinarsController } from './my-webinars.controller';
import { WebinarsService } from './webinars.service';
import { WebinarNotificationsService } from './webinar-notifications.service';
import { WebinarReminderCronService } from './webinar-reminder-cron.service';

@Module({
  controllers: [WebinarsController, MyWebinarsController],
  providers: [WebinarsService, WebinarNotificationsService, WebinarReminderCronService],
  exports: [WebinarsService, WebinarNotificationsService],
})
export class WebinarsModule {}
