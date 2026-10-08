import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrencyModule } from '../../common/currency/currency.module';
import { PaymentsService } from './payments.service';
import { PayPalClientService } from './paypal/paypal-client.service';
import { PayPalCheckoutController } from './paypal/paypal-checkout.controller';
import { PayPalWebhookController } from './paypal/paypal-webhook.controller';
import { RazorpayClientService } from './razorpay/razorpay-client.service';
import { RazorpayCheckoutController } from './razorpay/razorpay-checkout.controller';
import { RazorpayWebhookController } from './razorpay/razorpay-webhook.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule, CurrencyModule],
  controllers: [PayPalCheckoutController, PayPalWebhookController, RazorpayCheckoutController, RazorpayWebhookController],
  providers: [PaymentsService, PayPalClientService, RazorpayClientService],
})
export class PaymentsModule {}
