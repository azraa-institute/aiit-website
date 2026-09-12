import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Assignment } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';

@Controller('me')
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class MyAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('assignments')
  list(@CurrentUser() user: AuthenticatedUser): Promise<Assignment[]> {
    return this.assignments.listForUser(user.userId);
  }
}
