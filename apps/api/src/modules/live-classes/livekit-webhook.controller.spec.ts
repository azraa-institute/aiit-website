import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { LiveKitWebhookController } from './livekit-webhook.controller';
import { LiveKitService } from './livekit.service';
import { LiveClassesService } from './live-classes.service';

function fakeRequest(payload: Record<string, unknown>): Request {
  return {
    body: Buffer.from(JSON.stringify(payload)),
    headers: { authorization: 'signed-jwt' },
  } as unknown as Request;
}

describe('LiveKitWebhookController', () => {
  let controller: LiveKitWebhookController;
  let livekit: { verifyWebhook: jest.Mock };
  let liveClasses: { recordParticipantEvent: jest.Mock; recordEgressEvent: jest.Mock };

  beforeEach(() => {
    livekit = { verifyWebhook: jest.fn().mockReturnValue(true) };
    liveClasses = { recordParticipantEvent: jest.fn(), recordEgressEvent: jest.fn() };
    controller = new LiveKitWebhookController(livekit as unknown as LiveKitService, liveClasses as unknown as LiveClassesService);
  });

  it('rejects a request with an invalid signature', async () => {
    livekit.verifyWebhook.mockReturnValue(false);
    await expect(controller.webhook(fakeRequest({ event: 'egress_ended' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ignores an unrelated event', async () => {
    await controller.webhook(fakeRequest({ event: 'room_started' }));
    expect(liveClasses.recordEgressEvent).not.toHaveBeenCalled();
    expect(liveClasses.recordParticipantEvent).not.toHaveBeenCalled();
  });

  it('marks a completed egress complete, building the public URL from the resolved filename and R2_PUBLIC_URL', async () => {
    process.env.R2_PUBLIC_URL = 'https://media.aiit.network';
    await controller.webhook(
      fakeRequest({
        event: 'egress_ended',
        egressInfo: {
          egressId: 'EG_abc',
          status: 'EGRESS_COMPLETE',
          fileResults: [{ filename: 'recordings/class-1-170000.mp4', size: '2048', duration: '60000000000' }],
        },
      }),
    );
    expect(liveClasses.recordEgressEvent).toHaveBeenCalledWith('EG_abc', 'complete', {
      url: 'https://media.aiit.network/recordings/class-1-170000.mp4',
      durationSeconds: 60,
      fileSizeBytes: 2048n,
    });
    delete process.env.R2_PUBLIC_URL;
  });

  it('marks a failed egress failed, with LiveKit’s own error message', async () => {
    await controller.webhook(
      fakeRequest({ event: 'egress_ended', egressInfo: { egressId: 'EG_abc', status: 'EGRESS_FAILED', error: 'no participants' } }),
    );
    expect(liveClasses.recordEgressEvent).toHaveBeenCalledWith('EG_abc', 'failed', { error: 'no participants' });
  });

  it('marks an in-progress egress active on an egress_updated event, without stamping it complete', async () => {
    await controller.webhook(fakeRequest({ event: 'egress_updated', egressInfo: { egressId: 'EG_abc', status: 'EGRESS_ACTIVE' } }));
    expect(liveClasses.recordEgressEvent).toHaveBeenCalledWith('EG_abc', 'active', {});
  });

  it('still records participant join/leave events as before', async () => {
    await controller.webhook(
      fakeRequest({ event: 'participant_joined', room: { name: 'class-1' }, participant: { identity: 'user-1' }, createdAt: 1700000000 }),
    );
    expect(liveClasses.recordParticipantEvent).toHaveBeenCalledWith('participant_joined', 'class-1', 'user-1', new Date(1700000000 * 1000));
  });
});
