import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssignmentSubmissionsController } from './assignment-submissions.controller';
import { AssignmentsService } from './assignments.service';

describe('AssignmentSubmissionsController', () => {
  let controller: AssignmentSubmissionsController;
  let assignments: { submit: jest.Mock; grade: jest.Mock };

  beforeEach(async () => {
    assignments = { submit: jest.fn(), grade: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AssignmentSubmissionsController],
      providers: [
        { provide: AssignmentsService, useValue: assignments },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(AssignmentSubmissionsController);
  });

  it('delegates POST :id/submissions to AssignmentsService.submit', async () => {
    assignments.submit.mockResolvedValueOnce({});
    await controller.submit('asg-1', { note: 'My answer' }, { userId: 'user-1', role: 'learner' });
    expect(assignments.submit).toHaveBeenCalledWith('user-1', 'asg-1', { note: 'My answer' });
  });

  it('delegates PATCH :id/submissions/:submissionId to AssignmentsService.grade', async () => {
    assignments.grade.mockResolvedValueOnce({ grade: 'A', feedback: null, gradedAt: '2026-09-13T00:00:00.000Z' });
    await controller.grade('sub-1', { grade: 'A' });
    expect(assignments.grade).toHaveBeenCalledWith('sub-1', { grade: 'A' });
  });
});
