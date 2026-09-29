import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { LiveClassJoin, LiveClassPoll, LiveClassSummary, LiveClassWhiteboard, PinnedResource } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePollDto, PinResourceDto, SaveWhiteboardDto, VotePollDto } from './dto/live-class.dto';
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

  /** Restores the participant's permission to publish a microphone track -- they still have to click their own Unmute. */
  @Post('live-classes/:id/participants/:identity/unmute')
  @HttpCode(204)
  async unmute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity', ParseUUIDPipe) identity: string,
  ): Promise<void> {
    await this.liveClasses.moderate(user, id, identity, 'unmute');
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

  /** Readable after the class ends too, so it can be reviewed from the course workspace. */
  @Get('live-classes/:id/whiteboard')
  getWhiteboard(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<LiveClassWhiteboard> {
    return this.liveClasses.getWhiteboard(user, id);
  }

  @Put('live-classes/:id/whiteboard')
  @HttpCode(204)
  async saveWhiteboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveWhiteboardDto,
  ): Promise<void> {
    await this.liveClasses.saveWhiteboard(user, id, body.state);
  }

  /** Readable after the class ends too, so pinned links survive into the course workspace. */
  @Get('live-classes/:id/resources')
  resources(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<PinnedResource[]> {
    return this.liveClasses.listResources(user, id);
  }

  @Post('live-classes/:id/resources')
  pinResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PinResourceDto,
  ): Promise<PinnedResource[]> {
    return this.liveClasses.pinResource(user, id, dto);
  }

  @Delete('live-classes/:id/resources/:resourceId')
  unpinResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('resourceId') resourceId: string,
  ): Promise<PinnedResource[]> {
    return this.liveClasses.unpinResource(user, id, resourceId);
  }

  /** Null when no poll has been run yet. Results are only included for the host while it's open -- see LiveClassesService.toPollView. */
  @Get('live-classes/:id/poll')
  getPoll(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<LiveClassPoll | null> {
    return this.liveClasses.getPoll(user, id);
  }

  @Post('live-classes/:id/poll')
  createPoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePollDto,
  ): Promise<LiveClassPoll> {
    return this.liveClasses.createPoll(user, id, dto);
  }

  @Post('live-classes/:id/poll/vote')
  @HttpCode(200)
  votePoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VotePollDto,
  ): Promise<LiveClassPoll> {
    return this.liveClasses.votePoll(user, id, dto.optionId);
  }

  @Post('live-classes/:id/poll/close')
  @HttpCode(200)
  closePoll(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<LiveClassPoll> {
    return this.liveClasses.closePoll(user, id);
  }
}
