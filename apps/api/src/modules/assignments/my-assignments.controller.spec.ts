import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MyAssignmentsController } from './my-assignments.controller';
import { AssignmentsService } from './assignments.service';

describe('MyAssignmentsController', () => {
  let controller: MyAssignmentsController;
  let assignments: { listForUser: jest.Mock };

  beforeEach(async () => {
    assignments = { listForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyAssignmentsController],
      providers: [
        { provide: AssignmentsService, useValue: assignments },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(MyAssignmentsController);
  });

  it('delegates to AssignmentsService.listForUser with the authenticated user id', async () => {
    assignments.listForUser.mockResolvedValueOnce([]);
    await expect(controller.list({ userId: 'user-1', role: 'learner' })).resolves.toEqual([]);
    expect(assignments.listForUser).toHaveBeenCalledWith('user-1');
  });
});
