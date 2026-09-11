import { Injectable, Logger } from '@nestjs/common';
import type { HealthStatus } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): HealthStatus {
    return { status: 'ok', service: 'api' };
  }

  async checkDb(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'db' };
    } catch (err) {
      // The controller only returns a generic 503 to the client — log the
      // real cause here so it's actually diagnosable from server logs.
      this.logger.error('Database health check failed', err instanceof Error ? err.stack : err);
      return { status: 'error', service: 'db' };
    }
  }
}
