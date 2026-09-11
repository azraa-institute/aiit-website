import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@aiit/shared';

@Injectable()
export class HealthService {
  getLiveness(): HealthStatus {
    return { status: 'ok', service: 'api' };
  }
}
