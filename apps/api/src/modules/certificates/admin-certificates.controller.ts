import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AdminCertificateRow, Certificate, Paginated } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';
import { ListCertificatesQueryDto } from './dto/list-certificates.dto';

/** Not learner-callable. The list endpoint is the admin's browse-all-certificates view; revoke/unrevoke are also called from the admin student drawer (AdminStudentsPage), next to the certificate it already lists. */
@Controller('admin/certificates')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminCertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  list(@Query() query: ListCertificatesQueryDto): Promise<Paginated<AdminCertificateRow>> {
    return this.certificates.adminList(query);
  }

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
