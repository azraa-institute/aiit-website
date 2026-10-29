import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin wrapper around YouTube Data API v3 -- no SDK, matching
 * PaystackClientService/GithubPublisherService's native-`fetch` convention.
 * This is the *only* social platform AIIT's affiliate screening can verify
 * without the applicant's own OAuth consent: Instagram/TikTok/X/LinkedIn
 * all either require a business-app review process, a paid API tier, or
 * scraping that violates their ToS -- not worth building (see the project
 * plan this was built from). Unlike the payment clients, this never throws:
 * a verification failure must never block an application submission or
 * leave the caller needing a try/catch -- every public method resolves to
 * `null` on any problem (missing key, bad URL, API error, zero quota),
 * logged at `warn`, not `error`.
 */
@Injectable()
export class YoutubeClientService {
  private readonly logger = new Logger(YoutubeClientService.name);
  private readonly apiBase = 'https://www.googleapis.com/youtube/v3';

  private get apiKey(): string | undefined {
    return process.env.YOUTUBE_API_KEY;
  }

  /** Resolves a channel URL/handle to its current public subscriber count, or null if it can't be determined. */
  async fetchSubscriberCount(channelUrl: string): Promise<number | null> {
    if (!this.apiKey) return null;
    const lookup = parseChannelUrl(channelUrl);
    if (!lookup) return null;

    try {
      const params = new URLSearchParams({ part: 'statistics', key: this.apiKey, [lookup.param]: lookup.value });
      const res = await fetch(`${this.apiBase}/channels?${params.toString()}`);
      if (!res.ok) {
        this.logger.warn(`YouTube channels.list failed (${res.status}) for ${channelUrl}`);
        return null;
      }
      const json = (await res.json()) as { items?: { statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[] };
      const stats = json.items?.[0]?.statistics;
      if (!stats || stats.hiddenSubscriberCount || stats.subscriberCount == null) return null;
      const count = Number(stats.subscriberCount);
      return Number.isFinite(count) ? count : null;
    } catch (err) {
      this.logger.warn(`YouTube lookup threw for ${channelUrl}: ${(err as Error).message}`);
      return null;
    }
  }
}

/**
 * YouTube channel URLs come in several shapes; each needs a different
 * `channels.list` query param. Returns null for anything unrecognized
 * (a non-YouTube URL, a bare search page, etc.) rather than guessing.
 */
function parseChannelUrl(rawUrl: string): { param: 'id' | 'forHandle' | 'forUsername'; value: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(url.hostname.replace(/^www\./, ''))) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  if (segments[0].startsWith('@')) return { param: 'forHandle', value: segments[0] };
  if (segments[0] === 'channel' && segments[1]) return { param: 'id', value: segments[1] };
  if (segments[0] === 'c' && segments[1]) return { param: 'forHandle', value: `@${segments[1]}` };
  if (segments[0] === 'user' && segments[1]) return { param: 'forUsername', value: segments[1] };
  return null;
}
