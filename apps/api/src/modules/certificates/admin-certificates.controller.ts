import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Certificate } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';

/** Not learner-callable. Called from the admin student drawer (AdminStudentsPage), next to the certificate it already lists. */
@Controller('admin/certificates')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AdminCertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
  ): Promise<Certificate> {
    return this.certificates.revoke(id, dto.reason, user.userId);
  }

  @Post(':id/unrevoke')
  @HttpCode(200)
  unrevoke(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<Certificate> {
    return this.certificates.unrevoke(id, user.userId);
  }
}
