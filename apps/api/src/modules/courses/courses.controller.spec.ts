import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

function req(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('CoursesController', () => {
  let controller: CoursesController;
  let courses: { list: jest.Mock; detail: jest.Mock; curriculum: jest.Mock };

  beforeEach(async () => {
    courses = { list: jest.fn(), detail: jest.fn(), curriculum: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: courses }],
    }).compile();

    controller = moduleRef.get(CoursesController);
  });

  it('GET /courses passes the currency override and request headers through', async () => {
    courses.list.mockResolvedValueOnce([]);
    await controller.list({ currency: 'NGN' }, req({ 'cf-ipcountry': 'NG' }));
    expect(courses.list).toHaveBeenCalledWith({
      query: { currency: 'NGN' },
      headers: { 'cf-ipcountry': 'NG' },
    });
  });

  it('GET /courses/:slug delegates with the slug and resolved request', async () => {
    courses.detail.mockResolvedValueOnce({});
    await controller.detail('ai-engineering', {}, req());
    expect(courses.detail).toHaveBeenCalledWith('ai-engineering', {
      query: { currency: undefined },
      headers: {},
    });
  });

  it('GET /courses/:slug/curriculum delegates with just the slug', async () => {
    courses.curriculum.mockResolvedValueOnce([]);
    await controller.curriculum('ai-engineering');
    expect(courses.curriculum).toHaveBeenCalledWith('ai-engineering');
  });
});
