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
import { PaystackClientService } from './paystack/paystack-client.service';
import { PaystackCheckoutController } from './paystack/paystack-checkout.controller';
import { PaystackWebhookController } from './paystack/paystack-webhook.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule, CurrencyModule],
  controllers: [
    PayPalCheckoutController,
    PayPalWebhookController,
    RazorpayCheckoutController,
    RazorpayWebhookController,
    PaystackCheckoutController,
    PaystackWebhookController,
  ],
  providers: [PaymentsService, PayPalClientService, RazorpayClientService, PaystackClientService],
})
export class PaymentsModule {}
