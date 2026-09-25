import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Append-only trail of admin actions. Never throws -- an audit-write failure must not undo the action it describes. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    metadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId, metadata } });
    } catch (error) {
      this.logger.error(`Could not write audit entry ${action}`, error instanceof Error ? error.stack : String(error));
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
