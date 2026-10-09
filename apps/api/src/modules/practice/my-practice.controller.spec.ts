import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MyPracticeController } from './my-practice.controller';
import { PracticeService } from './practice.service';

const USER = { userId: 'user-1' } as never;

describe('MyPracticeController', () => {
  let controller: MyPracticeController;
  let practice: { listForUser: jest.Mock; getForTaking: jest.Mock; submitAttempt: jest.Mock };

  beforeEach(async () => {
    practice = { listForUser: jest.fn(), getForTaking: jest.fn(), submitAttempt: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyPracticeController],
      providers: [
        { provide: PracticeService, useValue: practice },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(MyPracticeController);
  });

  it('delegates list to PracticeService.listForUser with the caller\'s id', async () => {
    practice.listForUser.mockResolvedValueOnce([]);
    await controller.list(USER);
    expect(practice.listForUser).toHaveBeenCalledWith('user-1');
  });

  it('delegates get to PracticeService.getForTaking', async () => {
    practice.getForTaking.mockResolvedValueOnce({});
    await controller.get(USER, 'quiz-1');
    expect(practice.getForTaking).toHaveBeenCalledWith('user-1', 'quiz-1');
  });

  it('delegates submit to PracticeService.submitAttempt', async () => {
    const dto = { answers: [{ questionId: 'q-1', optionId: 'o-1' }] };
    practice.submitAttempt.mockResolvedValueOnce({});
    await controller.submit(USER, 'quiz-1', dto);
    expect(practice.submitAttempt).toHaveBeenCalledWith('user-1', 'quiz-1', dto);
  });
});
