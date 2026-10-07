import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from './payments.service';
import { PayPalClientService } from './paypal/paypal-client.service';
import { PayPalCheckoutController } from './paypal/paypal-checkout.controller';
import { PayPalWebhookController } from './paypal/paypal-webhook.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule],
  controllers: [PayPalCheckoutController, PayPalWebhookController],
  providers: [PaymentsService, PayPalClientService],
})
export class PaymentsModule {}
