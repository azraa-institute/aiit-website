import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InstructorQuizzesController } from './instructor-quizzes.controller';
import { PracticeService } from './practice.service';

const USER = { userId: 'instr-1' } as never;

describe('InstructorQuizzesController', () => {
  let controller: InstructorQuizzesController;
  let practice: {
    listForInstructor: jest.Mock;
    createQuiz: jest.Mock;
    getQuizForEditing: jest.Mock;
    updateQuiz: jest.Mock;
    deleteQuiz: jest.Mock;
  };

  beforeEach(async () => {
    practice = {
      listForInstructor: jest.fn(),
      createQuiz: jest.fn(),
      getQuizForEditing: jest.fn(),
      updateQuiz: jest.fn(),
      deleteQuiz: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InstructorQuizzesController],
      providers: [
        { provide: PracticeService, useValue: practice },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(InstructorQuizzesController);
  });

  it('delegates list to PracticeService.listForInstructor', async () => {
    practice.listForInstructor.mockResolvedValueOnce([]);
    await controller.list(USER, 'crs-1');
    expect(practice.listForInstructor).toHaveBeenCalledWith('instr-1', 'crs-1');
  });

  it('delegates create to PracticeService.createQuiz', async () => {
    const dto = { title: 'Module 1 check', questions: [] };
    practice.createQuiz.mockResolvedValueOnce({});
    await controller.create(USER, 'crs-1', dto);
    expect(practice.createQuiz).toHaveBeenCalledWith('instr-1', 'crs-1', dto);
  });

  it('delegates get to PracticeService.getQuizForEditing', async () => {
    practice.getQuizForEditing.mockResolvedValueOnce({});
    await controller.get(USER, 'quiz-1');
    expect(practice.getQuizForEditing).toHaveBeenCalledWith('instr-1', 'quiz-1');
  });

  it('delegates update to PracticeService.updateQuiz', async () => {
    const dto = { title: 'Updated', questions: [] };
    practice.updateQuiz.mockResolvedValueOnce({});
    await controller.update(USER, 'quiz-1', dto);
    expect(practice.updateQuiz).toHaveBeenCalledWith('instr-1', 'quiz-1', dto);
  });

  it('delegates remove to PracticeService.deleteQuiz', async () => {
    practice.deleteQuiz.mockResolvedValueOnce(undefined);
    await controller.remove(USER, 'quiz-1');
    expect(practice.deleteQuiz).toHaveBeenCalledWith('instr-1', 'quiz-1');
  });
});
