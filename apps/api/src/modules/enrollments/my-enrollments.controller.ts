import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Enrollment } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class MyEnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get('enrollments')
  list(@CurrentUser() user: AuthenticatedUser): Promise<Enrollment[]> {
    return this.enrollments.listForUser(user.userId);
  }
}
