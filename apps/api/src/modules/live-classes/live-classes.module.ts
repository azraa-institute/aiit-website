import { Module } from '@nestjs/common';
import { LiveKitService } from './livekit.service';
import { LiveClassesService } from './live-classes.service';
import { AdminLiveClassesService } from './admin-live-classes.service';
import { LiveClassesController } from './live-classes.controller';
import { AdminLiveClassesController } from './admin-live-classes.controller';
import { LiveKitWebhookController } from './livekit-webhook.controller';

@Module({
  controllers: [LiveClassesController, AdminLiveClassesController, LiveKitWebhookController],
  providers: [LiveKitService, LiveClassesService, AdminLiveClassesService],
})
export class LiveClassesModule {}
