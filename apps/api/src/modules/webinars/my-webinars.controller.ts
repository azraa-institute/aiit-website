import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { LearnerWebinar } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebinarsService } from './webinars.service';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class MyWebinarsController {
  constructor(private readonly webinars: WebinarsService) {}

  @Get('webinars')
  list(@CurrentUser() user: AuthenticatedUser): Promise<LearnerWebinar[]> {
    return this.webinars.myWebinars(user.email);
  }
}
