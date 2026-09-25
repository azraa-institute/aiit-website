import { Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { LiveClassesService } from './live-classes.service';
import { LiveKitService } from './livekit.service';

interface LiveKitWebhookEvent {
  event?: string;
  room?: { name?: string };
  participant?: { identity?: string };
  /** Unix seconds. */
  createdAt?: number | string;
}

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
    return { ok: true };
  }
}
