import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Me } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<Me> {
    return this.profiles.getMe(user.userId);
  }
}
