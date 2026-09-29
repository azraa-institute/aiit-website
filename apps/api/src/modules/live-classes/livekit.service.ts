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

interface LiveKitPermission {
  canSubscribe?: boolean;
  canPublish?: boolean;
  canPublishData?: boolean;
  /** LiveKit's TrackSource enum, JSON-encoded as either its name ('MICROPHONE') or number (2) depending on server version. */
  canPublishSources?: (string | number)[];
  hidden?: boolean;
  recorder?: boolean;
  canUpdateMetadata?: boolean;
}

interface LiveKitParticipantInfo {
  identity: string;
  tracks?: LiveKitTrack[];
  permission?: LiveKitPermission;
}

function isMicrophoneSource(value: string | number): boolean {
  return value === 'MICROPHONE' || value === 2;
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
    // Lets a learner set their own participant attributes (e.g. a raised-hand
    // timestamp) without granting them any moderation ability -- that stays
    // on roomAdmin, which only the host gets above.
    video.canUpdateOwnMetadata = true;
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

  /** Who's actually connected right now, for auto-splitting into breakout rooms -- an empty array if the room has no one in it (or doesn't exist yet, e.g. before anyone has joined). */
  async listParticipants(room: string): Promise<string[]> {
    const listed = await this.twirp<{ participants?: LiveKitParticipantInfo[] }>('ListParticipants', room, { room });
    return (listed.participants ?? []).map((p) => p.identity);
  }

  /** Mutes every audio track a participant is currently publishing. On its own this is a one-shot action -- the participant can simply unmute themselves again; pair with setMicrophonePublishAllowed(false) to actually prevent that. */
  async muteParticipant(room: string, identity: string): Promise<void> {
    const target = await this.findParticipant(room, identity);
    for (const track of target?.tracks ?? []) {
      if (track.type === 'AUDIO' || track.type === 0) {
        await this.twirp('MutePublishedTrack', room, { room, identity, trackSid: track.sid, muted: true });
      }
    }
  }

  /**
   * The real "can this person unmute themselves" switch. LiveKit's mute API
   * only toggles a track's current state -- a muted participant can always
   * republish/unmute on their own unless their publish *permission* itself
   * excludes the microphone source, which is what this changes. Fetches the
   * participant's current permission set first: LiveKit's UpdateParticipant
   * call replaces the whole permission object, not just canPublishSources,
   * so every other field must be round-tripped unchanged.
   */
  async setMicrophonePublishAllowed(room: string, identity: string, allowed: boolean): Promise<void> {
    const target = await this.findParticipant(room, identity);
    const current = target?.permission;
    const sources = (current?.canPublishSources ?? []).filter((s) => !isMicrophoneSource(s));
    if (allowed) sources.push('MICROPHONE');
    const permission: LiveKitPermission = {
      canSubscribe: current?.canSubscribe ?? true,
      canPublish: current?.canPublish ?? true,
      canPublishData: current?.canPublishData ?? true,
      canPublishSources: sources,
      hidden: current?.hidden ?? false,
      recorder: current?.recorder ?? false,
      canUpdateMetadata: current?.canUpdateMetadata ?? false,
    };
    await this.twirp('UpdateParticipant', room, { room, identity, permission });
  }

  private async findParticipant(room: string, identity: string): Promise<LiveKitParticipantInfo | undefined> {
    const listed = await this.twirp<{ participants?: LiveKitParticipantInfo[] }>('ListParticipants', room, { room });
    return listed.participants?.find((p) => p.identity === identity);
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
