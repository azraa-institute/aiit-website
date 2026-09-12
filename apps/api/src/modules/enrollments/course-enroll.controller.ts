import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Enrollment } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';

@Controller('courses')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class CourseEnrollController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post(':slug/enroll')
  enroll(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser): Promise<Enrollment> {
    return this.enrollments.enroll(user.userId, slug);
  }
}
