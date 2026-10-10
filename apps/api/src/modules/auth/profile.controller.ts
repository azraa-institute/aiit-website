import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Me } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

/** Mirrors the avatars bucket's own file_size_limit/allowed_mime_types (see the storage_bucket_limits migration) -- this is the fast server-side rejection, that bucket setting is the backstop for anything that reaches Storage regardless. */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  /**
   * Confirms phone verification -- called after the frontend completes
   * Supabase Auth's own OTP flow (updateUser({phone}) + verifyOtp). Never
   * trusts the client's say-so: checks the *auth* user's phone_confirmed_at
   * via the Supabase Admin API server-side before persisting anything (see
   * ProfileService.confirmPhoneVerification).
   */
  @Post('phone/confirm')
  confirmPhoneVerification(@CurrentUser() user: AuthenticatedUser): Promise<Me> {
    return this.profiles.confirmPhoneVerification(user.userId);
  }

  /** Staff first-login: clears the temporary-password flag once the new password is set. */
  @Post('password-changed')
  @HttpCode(HttpStatus.OK)
  passwordChanged(@CurrentUser() user: AuthenticatedUser): Promise<Me> {
    return this.profiles.clearMustChangePassword(user.userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<Me> {
    return this.profiles.updatePreferences(user.userId, dto);
  }

  /**
   * Uploaded through this API (service-role Storage write) rather than
   * the learner's browser calling Supabase Storage directly -- see
   * SupabaseAdminService.uploadToStorage's doc comment for why the
   * direct-upload path doesn't work for this project. A tighter throttle
   * than this controller's own default: each call does real Storage I/O,
   * not just a database write.
   *
   * memoryStorage (not the default diskStorage) so @UploadedFile() gives
   * a real in-memory Buffer -- nothing touches local disk for a file
   * that's just being forwarded straight to Storage.
   */
  @Post('avatar')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: AVATAR_MAX_BYTES } }))
  async uploadAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File): Promise<Me> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (!AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException("That file type isn't supported (allowed: jpeg, png, webp).");
    }
    return this.profiles.uploadAvatar(user.userId, file);
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  removeAvatar(@CurrentUser() user: AuthenticatedUser): Promise<Me> {
    return this.profiles.removeAvatar(user.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestDeletion(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.profiles.requestDeletion(user.userId, user.email);
  }
}
