import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AffiliateMe } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AffiliatesService } from './affiliates.service';
import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';
import { ApplyAffiliateDto } from './dto/apply-affiliate.dto';
import { ApplyNewAffiliateDto } from './dto/apply-new-affiliate.dto';
import { ActivateAffiliateDto } from './dto/activate-affiliate.dto';

/**
 * Not role-gated -- see AffiliatesService's doc comment for why. JwtGuard
 * is applied per-route rather than at the class level: `apply-new` is the
 * one deliberately public route here (a brand-new applicant has no session
 * yet to present), everything else needs one.
 */
@Controller('affiliates')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AffiliatesController {
  constructor(
    private readonly affiliates: AffiliatesService,
    private readonly pdfService: AffiliateAgreementPdfService,
  ) {}

  @Post('apply')
  @UseGuards(JwtGuard)
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyAffiliateDto, @Req() request: Request): Promise<AffiliateMe> {
    // agreedToTerms isn't forwarded -- the DTO's @Equals(true) already made "applied" and
    // "agreed" the same fact; signedName/signedAt are the actual evidence of consent.
    const { type, signedName, phone, handle, country, state, city, source, motivation } = dto;
    return this.affiliates.apply(user.userId, type, signedName, request.ip, { phone, handle, country, state, city, source, motivation });
  }

  /**
   * Public: a brand-new applicant with no AIIT account yet. Creates the
   * account server-side with a one-time password and emails it -- see
   * AffiliatesService.applyNew(). Tightly throttled (account creation is a
   * real abuse surface, unlike a read).
   */
  @Post('apply-new')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async applyNew(@Body() dto: ApplyNewAffiliateDto, @Req() request: Request): Promise<{ ok: true }> {
    await this.affiliates.applyNew(dto, request.ip);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<AffiliateMe> {
    return this.affiliates.me(user.userId);
  }

  /** Unlocks the referral link -- see AffiliatesService.activate(). */
  @Post('activate')
  @UseGuards(JwtGuard)
  activate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ActivateAffiliateDto): Promise<AffiliateMe> {
    return this.affiliates.activate(user.userId, dto.referenceCode);
  }

  @Post('reference-code/resend')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendReferenceCode(@CurrentUser() user: AuthenticatedUser): Promise<{ ok: true }> {
    await this.affiliates.resendReferenceCode(user.userId);
    return { ok: true };
  }

  /** Regenerated fresh from stored signature data every time -- see AffiliatesService.apply()'s comment on why no PDF binary is stored. Available any time after applying, not gated on approval: they signed it regardless of outcome. */
  @Get('me/agreement.pdf')
  @UseGuards(JwtGuard)
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
