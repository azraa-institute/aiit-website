import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Certificate } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class MyCertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('certificates')
  list(@CurrentUser() user: AuthenticatedUser): Promise<Certificate[]> {
    return this.certificates.listForUser(user.userId);
  }
}
