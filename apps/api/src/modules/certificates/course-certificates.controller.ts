import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Certificate } from '@aiit/shared';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';

/** Not learner-callable. No admin UI yet -- called directly with an admin JWT until one exists. */
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
}
