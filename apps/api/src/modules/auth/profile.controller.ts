import { Body, Controller, Delete, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Me } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Me> {
    return this.profiles.updateProfile(user.userId, dto);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<Me> {
    return this.profiles.updatePreferences(user.userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestDeletion(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.profiles.requestDeletion(user.userId);
  }
}
