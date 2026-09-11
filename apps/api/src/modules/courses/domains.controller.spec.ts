import { Test } from '@nestjs/testing';
import { DomainsController } from './domains.controller';
import { CoursesService } from './courses.service';

describe('DomainsController', () => {
  let controller: DomainsController;
  let courses: { listDomains: jest.Mock };

  beforeEach(async () => {
    courses = { listDomains: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [DomainsController],
      providers: [{ provide: CoursesService, useValue: courses }],
    }).compile();

    controller = moduleRef.get(DomainsController);
  });

  it('delegates to CoursesService.listDomains', async () => {
    courses.listDomains.mockResolvedValueOnce([]);
    await expect(controller.list()).resolves.toEqual([]);
    expect(courses.listDomains).toHaveBeenCalled();
  });
});
