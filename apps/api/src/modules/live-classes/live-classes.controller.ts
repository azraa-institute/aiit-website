import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { LiveClassJoin, LiveClassSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LiveClassesService } from './live-classes.service';

/** Learner + instructor (+ admin-as-moderator) endpoints. Every route re-checks access in the service. */
@Controller()
@UseGuards(JwtGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class LiveClassesController {
  constructor(private readonly liveClasses: LiveClassesService) {}

  /** The caller's timetable: learners see their enrolled courses' classes, instructors the ones they host. */
  @Get('me/live-classes')
  list(@CurrentUser() user: AuthenticatedUser): Promise<LiveClassSummary[]> {
    return this.liveClasses.listForUser(user);
  }

  /** Checks enrollment/host + join window, then returns a short-lived LiveKit token. For the host this is also "Start class". */
  @Post('live-classes/:id/join')
  @HttpCode(200)
  join(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<LiveClassJoin> {
    return this.liveClasses.join(user, id);
  }

  @Post('live-classes/:id/end')
  @HttpCode(200)
  end(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<LiveClassSummary> {
    return this.liveClasses.end(user, id);
  }

  @Post('live-classes/:id/participants/:identity/mute')
  @HttpCode(204)
  async mute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity', ParseUUIDPipe) identity: string,
  ): Promise<void> {
    await this.liveClasses.moderate(user, id, identity, 'mute');
  }

  @Post('live-classes/:id/participants/:identity/remove')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity', ParseUUIDPipe) identity: string,
  ): Promise<void> {
    await this.liveClasses.moderate(user, id, identity, 'remove');
  }
}
