import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AdminContactMessage, Paginated } from '@aiit/shared';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminMessagesService } from './admin-messages.service';
import { ListMessagesQueryDto } from './dto/admin.dto';

/** Read side of the public contact form -- see AdminMessagesService. */
@Controller('admin/messages')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminMessagesController {
  constructor(private readonly messages: AdminMessagesService) {}

  @Get()
  list(@Query() query: ListMessagesQueryDto): Promise<Paginated<AdminContactMessage>> {
    return this.messages.list(query);
  }
}
