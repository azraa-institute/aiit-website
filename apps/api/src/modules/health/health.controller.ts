import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@aiit/shared';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  liveness(): HealthStatus {
    return this.health.getLiveness();
  }
}
