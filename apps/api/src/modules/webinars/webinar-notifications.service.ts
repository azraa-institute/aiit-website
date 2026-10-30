import { Injectable, Logger } from '@nestjs/common';
import type { Webinar, WebinarRegistration } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';

type ReminderKind = '24h' | '30m';

/**
 * Confirmation + reminder emails for webinar registrations. Used by three
 * callers: forms/webinar/webinar.service.ts (confirmation, right after a
 * new registration), WebinarReminderCronService (the automatic sweep --
 * see its own doc comment for the time-window logic), and
 * AdminWebinarsService (the admin's manual "send now" action, `force:
 * true` to resend regardless of what's already gone out).
 */
@Injectable()
export class WebinarNotificationsService {
  private readonly logger = new Logger(WebinarNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async sendConfirmation(registration: WebinarRegistration, webinar: Webinar): Promise<void> {
    const when = webinar.startsAt ? formatWhen(webinar.startsAt) : webinar.scheduleNote;
    const ctaUrl = webinar.joinUrl ?? `${webOrigin()}/webinar`;
    const ctaLabel = webinar.joinUrl ? 'View your join link' : 'View webinar details';
    try {
      await this.email.send({
        to: registration.email,
        subject: `You're registered: ${webinar.title}`,
        html: brandedEmailHtml({
          heading: "You're registered!",
          intro: `Thanks for registering for "${webinar.title}", ${when}. We'll email the join link and a reminder before it starts.`,
          ctaLabel,
          ctaUrl,
          footerNote: `You're receiving this because you registered for an AIIT webinar with ${registration.email}.`,
        }),
      });
    } catch (err) {
      // Registration itself already succeeded and is saved -- a failed
      // confirmation email shouldn't make the whole request look like it
      // failed to the person who just registered. Same fail-open reasoning
      // as every other transactional email in this codebase.
      this.logger.error(`Could not send webinar confirmation to ${registration.email}`, err instanceof Error ? err.stack : String(err));
      return;
    }
    await this.prisma.webinarRegistration.update({ where: { id: registration.id }, data: { confirmationSentAt: new Date() } });
  }

  /**
   * Sends to every registrant of `webinarId` who hasn't already received
   * this specific reminder kind (`force: true` resends to everyone
   * regardless). No-ops (returns 0) if the webinar has no join link set
   * yet -- a reminder without anywhere to actually join isn't useful.
   * Returns the number actually sent.
   */
  async sendReminders(webinarId: string, kind: ReminderKind, opts: { force?: boolean } = {}): Promise<number> {
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar?.joinUrl) return 0;

    const notYetSent = kind === '24h' ? { reminder24hSentAt: null } : { reminder30mSentAt: null };
    const registrations = await this.prisma.webinarRegistration.findMany({
      where: { webinarId, ...(opts.force ? {} : notYetSent) },
    });
    if (registrations.length === 0) return 0;

    const when = webinar.startsAt ? formatWhen(webinar.startsAt) : webinar.scheduleNote;
    const heading = kind === '24h' ? 'Your webinar is tomorrow' : 'Your webinar starts in 30 minutes';
    const intro =
      kind === '24h'
        ? `"${webinar.title}" starts ${when}. Here's your join link, ready for when it's time.`
        : `"${webinar.title}" is starting very soon. Join now with the link below.`;

    let sent = 0;
    for (const r of registrations) {
      try {
        await this.email.send({
          to: r.email,
          subject: kind === '24h' ? `Reminder: ${webinar.title} is tomorrow` : `Starting soon: ${webinar.title}`,
          html: brandedEmailHtml({
            heading,
            intro,
            ctaLabel: 'Join the session',
            ctaUrl: webinar.joinUrl,
            footerNote: `You're receiving this because you registered for this AIIT webinar with ${r.email}.`,
          }),
        });
      } catch (err) {
        this.logger.error(`Could not send ${kind} reminder to ${r.email}`, err instanceof Error ? err.stack : String(err));
        continue;
      }
      const sentAt = kind === '24h' ? { reminder24hSentAt: new Date() } : { reminder30mSentAt: new Date() };
      await this.prisma.webinarRegistration.update({ where: { id: r.id }, data: sentAt });
      sent += 1;
    }
    return sent;
  }
}

function formatWhen(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(d);
}

function webOrigin(): string {
  return process.env.APP_URL ?? 'https://aiit.network';
}
