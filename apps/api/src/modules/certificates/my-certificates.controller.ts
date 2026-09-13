import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Certificate } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService, toPdfInput } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class MyCertificatesController {
  constructor(
    private readonly certificates: CertificatesService,
    private readonly pdfService: CertificatePdfService,
  ) {}

  @Get('certificates')
  list(@CurrentUser() user: AuthenticatedUser): Promise<Certificate[]> {
    return this.certificates.listForUser(user.userId);
  }

  @Get('certificates/:id/pdf')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async pdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const cert = await this.certificates.getOwned(user.userId, id);
    const buffer = await this.pdfService.render(toPdfInput(cert));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="AIIT-Certificate-${cert.credentialId}.pdf"`,
    });
    return new StreamableFile(buffer);
  }
}
