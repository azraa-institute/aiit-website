import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;
  let prisma: { geoState: { findMany: jest.Mock }; geoCity: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      geoState: { findMany: jest.fn() },
      geoCity: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [GeoService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(GeoService);
  });

  it('listStates queries by uppercased country code, ordered by name', async () => {
    prisma.geoState.findMany.mockResolvedValueOnce([{ id: 2686, name: 'Lagos' }]);
    await expect(service.listStates('ng')).resolves.toEqual([{ id: 2686, name: 'Lagos' }]);
    expect(prisma.geoState.findMany).toHaveBeenCalledWith({
      where: { countryCode: 'NG' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });

  it('listCities queries by the given state id, ordered by name', async () => {
    prisma.geoCity.findMany.mockResolvedValueOnce([{ id: 76744, name: 'Aba' }]);
    await expect(service.listCities(2686)).resolves.toEqual([{ id: 76744, name: 'Aba' }]);
    expect(prisma.geoCity.findMany).toHaveBeenCalledWith({
      where: { stateId: 2686 },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});
