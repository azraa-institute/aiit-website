import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok liveness with no database involved', () => {
    expect(controller.liveness()).toEqual({ status: 'ok', service: 'api' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('reports ok when the database check succeeds', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(controller.db()).resolves.toEqual({ status: 'ok', service: 'db' });
  });

  it('throws 503 when the database check fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    await expect(controller.db()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
