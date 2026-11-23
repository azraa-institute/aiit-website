import { Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { LiveClassesService } from './live-classes.service';
import { LiveKitService } from './livekit.service';

interface EgressFileResultPayload {
  filename?: string;
  location?: string;
  size?: string | number;
  duration?: string | number;
}

interface EgressInfoPayload {
  egressId?: string;
  status?: string;
  error?: string;
  fileResults?: EgressFileResultPayload[];
}

interface LiveKitWebhookEvent {
  event?: string;
  room?: { name?: string };
  participant?: { identity?: string };
  egressInfo?: EgressInfoPayload;
  /** Unix seconds. */
  createdAt?: number | string;
}

/** LiveKit's EgressInfo.status enum, JSON-encoded as its string name. */
const EGRESS_COMPLETE = 'EGRESS_COMPLETE';
const EGRESS_FAILED_STATUSES = new Set(['EGRESS_FAILED', 'EGRESS_ABORTED', 'EGRESS_LIMIT_REACHED']);

/**
 * LiveKit -> us. Unauthenticated by JWT (LiveKit has no user), but every call
 * must carry a signature made with our API secret over the exact raw body --
 * main.ts mounts a raw body parser on this path so that body is available.
 */
@Controller('livekit')
@SkipThrottle()
export class LiveKitWebhookController {
  constructor(
    private readonly livekit: LiveKitService,
    private readonly liveClasses: LiveClassesService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request): Promise<{ ok: true }> {
    const raw = Buffer.isBuffer(req.body) ? req.body : undefined;
    if (!raw || !this.livekit.verifyWebhook(req.headers.authorization, raw)) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    let payload: LiveKitWebhookEvent;
    try {
      payload = JSON.parse(raw.toString('utf8')) as LiveKitWebhookEvent;
    } catch {
      return { ok: true };
    }

    const room = payload.room?.name;
    const identity = payload.participant?.identity;
    if ((payload.event === 'participant_joined' || payload.event === 'participant_left') && room && identity) {
      const seconds = Number(payload.createdAt);
      const at = Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
      await this.liveClasses.recordParticipantEvent(payload.event, room, identity, at);
    }

    if ((payload.event === 'egress_updated' || payload.event === 'egress_ended') && payload.egressInfo?.egressId) {
      await this.handleEgressEvent(payload.egressInfo);
    }

    return { ok: true };
  }

  /**
   * Only egress_ended carries a final status worth acting on -- egress_updated
   * fires repeatedly while still EGRESS_ACTIVE, which recordEgressEvent would
   * otherwise re-stamp as 'active' pointlessly on every update. filename (the
   * resolved relative key, e.g. "recordings/class-x-170000.mp4") is used to
   * build the public URL via R2_PUBLIC_URL, the same convention
   * R2Service.createPresignedUploadUrl already uses -- not EgressInfo's own
   * `location` field, whose exact shape for an S3-compatible (non-AWS)
   * target isn't documented and shouldn't be trusted blindly.
   */
  private async handleEgressEvent(info: EgressInfoPayload): Promise<void> {
    const egressId = info.egressId;
    if (!egressId) return;

    if (info.status === EGRESS_COMPLETE) {
      const file = info.fileResults?.[0];
      const key = file?.filename;
      const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
      const url = key && base ? `${base}/${key}` : undefined;
      const duration = file?.duration != null ? Math.round(Number(file.duration) / 1_000_000_000) : undefined; // LiveKit reports duration in nanoseconds
      await this.liveClasses.recordEgressEvent(egressId, 'complete', {
        url,
        durationSeconds: Number.isFinite(duration) ? duration : undefined,
        fileSizeBytes: file?.size != null ? BigInt(file.size) : undefined,
      });
    } else if (info.status && EGRESS_FAILED_STATUSES.has(info.status)) {
      await this.liveClasses.recordEgressEvent(egressId, 'failed', { error: info.error || 'Recording failed.' });
    } else if (info.status === 'EGRESS_ACTIVE') {
      await this.liveClasses.recordEgressEvent(egressId, 'active', {});
    }
  }
}
