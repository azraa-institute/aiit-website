import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { TurnstileModule } from '../../common/turnstile/turnstile.module';
import { ContactController } from './contact/contact.controller';
import { ContactService } from './contact/contact.service';
import { NewsletterController } from './newsletter/newsletter.controller';
import { NewsletterService } from './newsletter/newsletter.service';
import { WebinarController } from './webinar/webinar.controller';
import { WebinarService } from './webinar/webinar.service';
import { AffiliateController } from './affiliate/affiliate.controller';
import { AffiliateService } from './affiliate/affiliate.service';

@Module({
  imports: [EmailModule, TurnstileModule],
  controllers: [ContactController, NewsletterController, WebinarController, AffiliateController],
  providers: [ContactService, NewsletterService, WebinarService, AffiliateService],
})
export class FormsModule {}
