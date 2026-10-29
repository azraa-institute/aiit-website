import { Injectable, Logger } from '@nestjs/common';

export interface BrevoContactInput {
  email: string;
  attributes?: Record<string, string | number | boolean | null>;
  listIds?: number[];
}

/**
 * Thin wrapper around Brevo's Contacts API -- no SDK, matching
 * PaystackClientService/GithubPublisherService's native-`fetch`
 * convention. A marketing-sync failure must never break an affiliate
 * application or a newsletter signup, so unlike the payment clients this
 * never throws: every public method resolves to a plain boolean/void and
 * logs a `warn` on any failure (missing key, API error, network blip).
 * Callers should fire this without awaiting it on the response path (see
 * AffiliatesService.applyNew()).
 */
@Injectable()
export class BrevoClientService {
  private readonly logger = new Logger(BrevoClientService.name);
  private readonly apiBase = 'https://api.brevo.com/v3';

  private get apiKey(): string | undefined {
    return process.env.BREVO_API_KEY;
  }

  /** Creates the contact, or updates it in place if the email already exists (`updateEnabled: true`) -- so this is safe to call again for the same person (e.g. an affiliate re-applying). */
  async upsertContact(input: BrevoContactInput): Promise<void> {
    if (!this.apiKey) return;
    try {
      const res = await fetch(`${this.apiBase}/contacts`, {
        method: 'POST',
        headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.email,
          attributes: input.attributes ?? {},
          listIds: input.listIds ?? [],
          updateEnabled: true,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Brevo upsertContact failed (${res.status}) for ${input.email}: ${text}`);
      }
    } catch (err) {
      this.logger.warn(`Brevo upsertContact threw for ${input.email}: ${(err as Error).message}`);
    }
  }
}
