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
})
export class AffiliatesModule {}
