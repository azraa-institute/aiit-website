import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthStatus } from '@aiit/shared';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  liveness(): HealthStatus {
    return this.health.getLiveness();
  }

  @Get('db')
  async db(): Promise<HealthStatus> {
    const result = await this.health.checkDb();
    if (result.status === 'error') {
      throw new ServiceUnavailableException('Database check failed.');
    }
    return result;
  }
}
