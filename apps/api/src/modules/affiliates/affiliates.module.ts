import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { PaymentsModule } from '../payments/payments.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateAgreementController } from './affiliate-agreement.controller';
import { AffiliatesService } from './affiliates.service';
import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';

@Module({
  // PaymentsModule is here only for PaymentsService.listBanksForCountry() --
  // the affiliate payout form's bank-name dropdown reuses Paystack's bank
  // directory, the same provider client the course checkout flow already
  // talks to, rather than standing up a second one.
  imports: [EmailModule, PaymentsModule],
  controllers: [AffiliatesController, AffiliateAgreementController],
  providers: [AffiliatesService, AffiliateAgreementPdfService],
  // AdminAffiliatesService calls AffiliatesService.createManually() so the
  // admin "add affiliate manually" flow reuses the exact same row-creation
  // logic as the public application form, instead of a second copy of it.
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
