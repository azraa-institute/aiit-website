import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MyEnrollmentsController } from './my-enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

describe('MyEnrollmentsController', () => {
  let controller: MyEnrollmentsController;
  let enrollments: { listForUser: jest.Mock };

  beforeEach(async () => {
    enrollments = { listForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyEnrollmentsController],
      providers: [
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(MyEnrollmentsController);
  });

  it('delegates to EnrollmentsService.listForUser with the authenticated user id', async () => {
    enrollments.listForUser.mockResolvedValueOnce([]);
    await expect(controller.list({ userId: 'user-1', role: 'learner' })).resolves.toEqual([]);
    expect(enrollments.listForUser).toHaveBeenCalledWith('user-1');
  });
});
