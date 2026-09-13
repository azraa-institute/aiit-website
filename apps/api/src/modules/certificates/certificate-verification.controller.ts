import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Certificate } from '@aiit/shared';
import { CertificatesService, toPdfInput } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

/**
 * Public, unauthenticated -- anyone with a credential id (an employer, a
 * university admissions office) can confirm a certificate is real, the
 * whole point of issuing one. No guard: CertificatesService.getByCredentialId
 * only ever selects public-safe fields (never userId), and the credential
 * id itself is the human-shareable identifier a holder hands out on
 * purpose (see Certificate.credentialId), not a private lookup key.
 */
@Controller('certificates/verify')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class CertificateVerificationController {
  constructor(
    private readonly certificates: CertificatesService,
    private readonly pdfService: CertificatePdfService,
  ) {}

  @Get(':credentialId')
  verify(@Param('credentialId') credentialId: string): Promise<Certificate> {
    return this.certificates.getByCredentialId(credentialId);
  }

  @Get(':credentialId/pdf')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async pdf(@Param('credentialId') credentialId: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const cert = await this.certificates.getByCredentialId(credentialId);
    const buffer = await this.pdfService.render(toPdfInput(cert));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="AIIT-Certificate-${cert.credentialId}.pdf"`,
    });
    return new StreamableFile(buffer);
  }
}
