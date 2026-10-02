import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { TurnstileModule } from '../../common/turnstile/turnstile.module';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { ContactController } from './contact/contact.controller';
import { ContactService } from './contact/contact.service';
import { NewsletterController } from './newsletter/newsletter.controller';
import { NewsletterService } from './newsletter/newsletter.service';
import { WebinarController } from './webinar/webinar.controller';
import { WebinarService } from './webinar/webinar.service';
import { ConsentController } from './consent/consent.controller';
import { ConsentService } from './consent/consent.service';

// The old affiliate-applications lead-capture form (affiliate/) was retired
// in favor of the real self-service affiliate program -- see
// apps/api/src/modules/affiliates and admin-affiliates.service.ts. Its
// table (affiliate_applications) and any historical rows in it are left in
// place, just no longer written to.
@Module({
  imports: [EmailModule, TurnstileModule],
  controllers: [ContactController, NewsletterController, WebinarController, ConsentController],
  providers: [ContactService, NewsletterService, WebinarService, ConsentService, JwtGuard],
})
export class FormsModule {}
