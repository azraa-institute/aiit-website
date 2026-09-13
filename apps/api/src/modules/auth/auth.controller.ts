import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Me } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { EmailExistsQueryDto } from './dto/email-exists.dto';

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<Me> {
    return this.profiles.getMe(user.userId, user.email);
  }

  /** Public -- backs ForgotPasswordPage's "no account found" message. Tightly throttled: see the enumeration note on ProfileService.emailExists. */
  @Get('email-exists')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async emailExists(@Query() query: EmailExistsQueryDto): Promise<{ exists: boolean }> {
    return { exists: await this.profiles.emailExists(query.email) };
  }
}
