import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  controllers: [AuthController, ProfileController],
  providers: [ProfileService],
})
export class AuthModule {}
