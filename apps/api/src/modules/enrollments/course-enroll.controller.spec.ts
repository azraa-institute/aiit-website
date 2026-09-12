import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CourseEnrollController } from './course-enroll.controller';
import { EnrollmentsService } from './enrollments.service';

describe('CourseEnrollController', () => {
  let controller: CourseEnrollController;
  let enrollments: { enroll: jest.Mock };

  beforeEach(async () => {
    enrollments = { enroll: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [CourseEnrollController],
      providers: [
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(CourseEnrollController);
  });

  it('delegates to EnrollmentsService.enroll with the slug and authenticated user id', async () => {
    enrollments.enroll.mockResolvedValueOnce({});
    await controller.enroll('digital-and-tech-literacy-absolute-beginner', {
      userId: 'user-1',
      role: 'learner',
    });
    expect(enrollments.enroll).toHaveBeenCalledWith('user-1', 'digital-and-tech-literacy-absolute-beginner');
  });
});
