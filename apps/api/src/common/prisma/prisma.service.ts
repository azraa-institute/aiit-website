import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Deliberately lazy: Prisma connects on first query rather than eagerly in
 * onModuleInit. That keeps app bootstrap independent of DB availability —
 * a transient outage should make GET /health/db fail, not crash the whole
 * process (GET /health has nothing to do with the database at all).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
