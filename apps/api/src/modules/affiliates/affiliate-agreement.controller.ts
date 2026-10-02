import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AffiliateAgreement } from '@aiit/shared';
import { AFFILIATE_AGREEMENT_SECTIONS, AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';

/**
 * Public, unauthenticated, on purpose -- a prospective applicant should be
 * able to read the Affiliate Agreement before creating an account, the same
 * as the plain PDF download link it replaces was always reachable without
 * signing in. Single source of truth for the legal text: AffiliatePage.tsx
 * fetches this to render the agreement inline on the apply form, and
 * AffiliateAgreementPdfService renders the same AFFILIATE_AGREEMENT_SECTIONS
 * into the signed PDF -- see affiliate-agreement.ts's own doc comment.
 */
@Controller('affiliates')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AffiliateAgreementController {
  @Get('agreement')
  get(): AffiliateAgreement {
    return { version: AFFILIATE_AGREEMENT_VERSION, sections: AFFILIATE_AGREEMENT_SECTIONS };
  }
}
