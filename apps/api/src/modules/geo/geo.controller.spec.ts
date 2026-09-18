import { Test } from '@nestjs/testing';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

describe('GeoController', () => {
  let controller: GeoController;
  let geo: { listStates: jest.Mock; listCities: jest.Mock };

  beforeEach(async () => {
    geo = { listStates: jest.fn(), listCities: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [{ provide: GeoService, useValue: geo }],
    }).compile();

    controller = moduleRef.get(GeoController);
  });

  it('delegates to GeoService.listStates with the query country', async () => {
    geo.listStates.mockResolvedValueOnce([{ id: 1, name: 'Lagos' }]);
    await expect(controller.states({ country: 'NG' })).resolves.toEqual([{ id: 1, name: 'Lagos' }]);
    expect(geo.listStates).toHaveBeenCalledWith('NG');
  });

  it('delegates to GeoService.listCities with the query state id', async () => {
    geo.listCities.mockResolvedValueOnce([{ id: 76744, name: 'Aba' }]);
    await expect(controller.cities({ state: 2686 })).resolves.toEqual([{ id: 76744, name: 'Aba' }]);
    expect(geo.listCities).toHaveBeenCalledWith(2686);
  });
});
