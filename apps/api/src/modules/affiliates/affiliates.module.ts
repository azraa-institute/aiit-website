import { Module } from '@nestjs/common';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateAgreementController } from './affiliate-agreement.controller';
import { AffiliatesService } from './affiliates.service';
import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';

@Module({
  controllers: [AffiliatesController, AffiliateAgreementController],
  providers: [AffiliatesService, AffiliateAgreementPdfService],
})
export class AffiliatesModule {}
