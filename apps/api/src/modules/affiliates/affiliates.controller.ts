import { Body, Controller, Get, Post, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AffiliateMe } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AffiliatesService } from './affiliates.service';
import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';
import { ApplyAffiliateDto } from './dto/apply-affiliate.dto';

/** Not role-gated -- see AffiliatesService's doc comment for why. */
@Controller('affiliates')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AffiliatesController {
  constructor(
    private readonly affiliates: AffiliatesService,
    private readonly pdfService: AffiliateAgreementPdfService,
  ) {}

  @Post('apply')
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyAffiliateDto, @Req() request: Request): Promise<AffiliateMe> {
    // agreedToTerms isn't forwarded -- the DTO's @Equals(true) already made "applied" and
    // "agreed" the same fact; signedName/signedAt are the actual evidence of consent.
    const { type, signedName, phone, handle, country, city, source, motivation } = dto;
    return this.affiliates.apply(user.userId, type, signedName, request.ip, { phone, handle, country, city, source, motivation });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AffiliateMe> {
    return this.affiliates.me(user.userId);
  }

  /** Regenerated fresh from stored signature data every time -- see AffiliatesService.apply()'s comment on why no PDF binary is stored. Available any time after applying, not gated on approval: they signed it regardless of outcome. */
  @Get('me/agreement.pdf')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async myAgreementPdf(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const affiliate = await this.affiliates.getOwnSignedRecord(user.userId);
    const buffer = await this.pdfService.render(affiliate);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="AIIT-Affiliate-Agreement.pdf"',
    });
    return new StreamableFile(buffer);
  }
}
