import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Cloudflare Turnstile token server-side before a public form
 * write is accepted. Fails closed, not open: if TURNSTILE_SECRET_KEY isn't
 * set, requests are refused with a clear error rather than silently letting
 * unprotected submissions through -- the same "don't pretend it works when
 * it doesn't" rule already applied to JwtGuard's missing-config case.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      throw new ServiceUnavailableException('Bot protection is not configured yet.');
    }
    if (!token) {
      throw new ServiceUnavailableException('Bot verification failed. Please try again.');
    }

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    let result: { success?: boolean };
    try {
      const response = await fetch(VERIFY_URL, { method: 'POST', body });
      result = (await response.json()) as { success?: boolean };
    } catch (error) {
      this.logger.error(
        'Turnstile verification request failed.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Bot verification failed. Please try again.');
    }

    if (!result.success) {
      throw new ServiceUnavailableException('Bot verification failed. Please try again.');
    }
  }
}
