import { Injectable, Logger } from '@nestjs/common';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = 'AIIT <noreply@aiit.network>';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper over Resend's HTTP API (plain fetch, no SDK -- one POST with
 * an API key needs nothing heavier). Best-effort, not a security control
 * like TurnstileService: a submission that fails to store because email
 * couldn't send would be a real bug, but a submission that saves fine while
 * its notification email fails is a logged inconvenience, not a reason to
 * fail the request. No-ops with a warning if RESEND_API_KEY isn't set,
 * mirroring how Sentry is a no-op without SENTRY_DSN.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send({ to, subject, html }: SendEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY not set -- skipped sending "${subject}" to ${to}.`);
      return;
    }

    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to, subject, html }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Resend send failed (${response.status}) for "${subject}" to ${to}: ${body}`);
      }
    } catch (error) {
      this.logger.error(
        `Resend send threw for "${subject}" to ${to}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
