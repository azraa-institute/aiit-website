import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [EmailModule],
  controllers: [AuthController, ProfileController],
  providers: [ProfileService],
})
export class AuthModule {}
