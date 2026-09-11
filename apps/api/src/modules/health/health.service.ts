import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): HealthStatus {
    return { status: 'ok', service: 'api' };
  }

  async checkDb(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'db' };
    } catch {
      return { status: 'error', service: 'db' };
    }
  }
}
