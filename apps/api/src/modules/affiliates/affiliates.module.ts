import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateAgreementController } from './affiliate-agreement.controller';
import { AffiliatesService } from './affiliates.service';
import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';

@Module({
  imports: [EmailModule],
  controllers: [AffiliatesController, AffiliateAgreementController],
  providers: [AffiliatesService, AffiliateAgreementPdfService],
  // AdminAffiliatesService calls AffiliatesService.createManually() so the
  // admin "add affiliate manually" flow reuses the exact same row-creation
  // logic as the public application form, instead of a second copy of it.
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
