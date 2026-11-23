import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { BulkIssueCertificatesResult, Certificate, CertificateEligibleStudent } from '@aiit/shared';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { BulkIssueCertificatesDto } from './dto/bulk-issue-certificates.dto';

/** Not learner-callable. Called from the admin student drawer (AdminStudentsPage) and the bulk-issue panel (AdminCertificatesPage). */
@Controller('courses')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class CourseCertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Post(':slug/certificates')
  issue(@Param('slug') slug: string, @Body() dto: IssueCertificateDto): Promise<Certificate> {
    return this.certificates.issue(slug, dto.userId);
  }

  @Get(':slug/certificates/eligible')
  eligible(@Param('slug') slug: string): Promise<CertificateEligibleStudent[]> {
    return this.certificates.eligibleForCourse(slug);
  }

  @Post(':slug/certificates/bulk')
  issueBulk(@Param('slug') slug: string, @Body() dto: BulkIssueCertificatesDto): Promise<BulkIssueCertificatesResult> {
    return this.certificates.issueBulk(slug, dto.userIds);
  }
}
