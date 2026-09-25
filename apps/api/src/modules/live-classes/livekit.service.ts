import { createHash } from 'crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export interface LiveKitTokenInput {
  identity: string;
  name: string;
  room: string;
  /** Instructors/admins: can moderate the room and share their screen. Learners: mic + camera + chat only. */
  host: boolean;
  /** JSON string stored on the participant; the UI reads the role from it. */
  metadata?: string;
  ttlSeconds?: number;
}

interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

interface LiveKitTrack {
  sid: string;
  type?: string | number;
}

/**
 * Thin server-side LiveKit client. Deliberately built on `jsonwebtoken` (already
 * a dependency, CommonJS-safe) instead of livekit-server-sdk: LiveKit access
 * tokens are plain HS256 JWTs and the room-admin API is Twirp over HTTPS, so
 * the two pieces needed here are ~60 lines and add no ESM/CJS build risk.
 * The API secret is only ever read here and never returned to a client.
 */
@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  isConfigured(): boolean {
    return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  }

  private get config(): LiveKitConfig {
    const { LIVEKIT_URL: url, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = process.env;
    if (!url || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Live classes are not configured yet.');
    }
    return { url, apiKey, apiSecret };
  }

  /** The WebSocket URL handed to the browser. */
  get wsUrl(): string {
    return this.config.url;
  }

  createJoinToken(input: LiveKitTokenInput): string {
    const { apiKey, apiSecret } = this.config;
    const video: Record<string, unknown> = {
      room: input.room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
    };
    if (input.host) {
      video.roomAdmin = true;
    } else {
      video.canPublishSources = ['camera', 'microphone'];
    }
    return jwt.sign({ name: input.name, metadata: input.metadata, video }, apiSecret, {
      algorithm: 'HS256',
      issuer: apiKey,
      subject: input.identity,
      expiresIn: input.ttlSeconds ?? 15 * 60,
    });
  }

  /** Verifies a webhook's Authorization JWT and that it matches the exact body received. */
  verifyWebhook(authorization: string | undefined, rawBody: Buffer): boolean {
    if (!authorization || !this.isConfigured()) return false;
    const { apiKey, apiSecret } = this.config;
    try {
      const claims = jwt.verify(authorization, apiSecret, { algorithms: ['HS256'], issuer: apiKey }) as {
        sha256?: string;
      };
      const digest = createHash('sha256').update(rawBody).digest('base64');
      return claims.sha256 === digest;
    } catch {
      return false;
    }
  }

  async removeParticipant(room: string, identity: string): Promise<void> {
    await this.twirp('RemoveParticipant', room, { room, identity });
  }

  async deleteRoom(room: string): Promise<void> {
    await this.twirp('DeleteRoom', room, { room });
  }

  /** Mutes every audio track a participant is currently publishing. */
  async muteParticipant(room: string, identity: string): Promise<void> {
    const listed = await this.twirp<{ participants?: { identity: string; tracks?: LiveKitTrack[] }[] }>(
      'ListParticipants',
      room,
      { room },
    );
    const target = listed.participants?.find((p) => p.identity === identity);
    for (const track of target?.tracks ?? []) {
      if (track.type === 'AUDIO' || track.type === 0) {
        await this.twirp('MutePublishedTrack', room, { room, identity, trackSid: track.sid, muted: true });
      }
    }
  }

  private async twirp<T = unknown>(method: string, room: string, body: Record<string, unknown>): Promise<T> {
    const { url, apiKey, apiSecret } = this.config;
    const token = jwt.sign({ video: { roomAdmin: true, room } }, apiSecret, {
      algorithm: 'HS256',
      issuer: apiKey,
      expiresIn: 60,
    });
    const httpUrl = url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
    const res = await fetch(`${httpUrl}/twirp/livekit.RoomService/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`LiveKit ${method} failed (${res.status}): ${text.slice(0, 200)}`);
      throw new ServiceUnavailableException('The live classroom service could not complete that action.');
    }
    return (await res.json().catch(() => ({}))) as T;
  }
}
