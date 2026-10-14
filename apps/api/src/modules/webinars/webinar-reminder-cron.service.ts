import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebinarNotificationsService } from './webinar-notifications.service';

/**
 * Automatic reminder sweep -- this is the real mechanism, not the admin's
 * manual "send now" button (AdminWebinarsService), which exists only for a
 * deliberate early blast or resend. Runs every 5 minutes; each tick is
 * cheap and idempotent (WebinarNotificationsService.sendReminders only
 * ever emails a registrant who hasn't already received that specific
 * reminder), so a missed or doubled tick is harmless.
 *
 * Time windows, not single thresholds, and deliberately bounded on both
 * ends: a webinar with no joinUrl yet never sends (see
 * sendReminders' own guard). If the admin sets the join link only shortly
 * before the session, the 24h window has already closed by then (cuts off
 * at T-1h) -- firing a "this is happening tomorrow" email minutes before
 * the actual start would be actively confusing, not helpful. The 30m
 * reminder is unaffected by that and still fires normally.
 */
@Injectable()
export class WebinarReminderCronService {
  private readonly logger = new Logger(WebinarReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: WebinarNotificationsService,
  ) {}

  @Cron('*/5 * * * *')
  async sweep(): Promise<void> {
    const webinars = await this.prisma.webinar.findMany({
      where: { joinUrl: { not: null }, startsAt: { not: null, gt: new Date() } },
    });

    for (const w of webinars) {
      const hoursUntil = (w.startsAt!.getTime() - Date.now()) / 3_600_000;
      try {
        if (hoursUntil <= 24 && hoursUntil > 1) {
          const sent = await this.notifications.sendReminders(w.id, '24h');
          if (sent > 0) this.logger.log(`Sent ${sent} 24h reminder(s) for "${w.title}".`);
        }
        if (hoursUntil <= 0.5 && hoursUntil > 0) {
          const sent = await this.notifications.sendReminders(w.id, '30m');
          if (sent > 0) this.logger.log(`Sent ${sent} 30m reminder(s) for "${w.title}".`);
        }
      } catch (err) {
        this.logger.error(`Reminder sweep failed for webinar ${w.id}`, err instanceof Error ? err.stack : String(err));
      }
    }
  }
}
