import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentsService } from './assignments.service';

const COURSE = {
  id: 'crs-1',
  slug: 'digital-and-tech-literacy-absolute-beginner',
  title: 'Digital & Tech Literacy (Absolute Beginner)',
  image: '/course.jpg',
  level: 'beginner',
  pricing: 'free',
  domain: null,
};

function assignmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'asg-1',
    title: 'Set up your first cloud account',
    description: 'Create a free-tier account and take a screenshot of the dashboard.',
    dueAt: null,
    course: COURSE,
    submissions: [],
    ...overrides,
  };
}

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: {
    enrollment: { findMany: jest.Mock };
    assignment: { findMany: jest.Mock; findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    assignmentSubmission: { upsert: jest.Mock; update: jest.Mock };
  };
  let enrollments: { isEnrolled: jest.Mock };
  let notifications: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      enrollment: { findMany: jest.fn() },
      assignment: { findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      assignmentSubmission: { upsert: jest.fn(), update: jest.fn() },
    };
    enrollments = { isEnrolled: jest.fn() };
    notifications = { create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(AssignmentsService);
  });

  describe('listForUser', () => {
    it('returns an empty list with no query when the user has no enrollments', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([]);
      await expect(service.listForUser('user-1')).resolves.toEqual([]);
      expect(prisma.assignment.findMany).not.toHaveBeenCalled();
    });

    it('derives status: upcoming for a future/no due date with no submission', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 'crs-1' }]);
      prisma.assignment.findMany.mockResolvedValueOnce([assignmentRow()]);
      const result = await service.listForUser('user-1');
      expect(result[0].status).toBe('upcoming');
      expect(result[0].submission).toBeNull();
    });

    it('derives status: overdue for a past due date with no submission', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 'crs-1' }]);
      prisma.assignment.findMany.mockResolvedValueOnce([
        assignmentRow({ dueAt: new Date('2020-01-01T00:00:00.000Z') }),
      ]);
      const result = await service.listForUser('user-1');
      expect(result[0].status).toBe('overdue');
    });

    it('derives status: submitted once submittedAt is set with no grade', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 'crs-1' }]);
      prisma.assignment.findMany.mockResolvedValueOnce([
        assignmentRow({
          submissions: [
            {
              fileKey: 'user-1/asg-1.pdf',
              note: 'Done',
              submittedAt: new Date('2026-09-12T00:00:00.000Z'),
              grade: null,
              feedback: null,
              gradedAt: null,
            },
          ],
        }),
      ]);
      const result = await service.listForUser('user-1');
      expect(result[0].status).toBe('submitted');
      expect(result[0].submission?.note).toBe('Done');
    });

    it('derives status: graded once gradedAt is set', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 'crs-1' }]);
      prisma.assignment.findMany.mockResolvedValueOnce([
        assignmentRow({
          submissions: [
            {
              fileKey: null,
              note: 'Done',
              submittedAt: new Date('2026-09-12T00:00:00.000Z'),
              grade: 'A',
              feedback: 'Great work.',
              gradedAt: new Date('2026-09-13T00:00:00.000Z'),
            },
          ],
        }),
      ]);
      const result = await service.listForUser('user-1');
      expect(result[0].status).toBe('graded');
      expect(result[0].submission?.grade).toBe('A');
    });
  });

  describe('submit', () => {
    it('throws NotFoundException for a missing assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValueOnce(null);
      await expect(service.submit('user-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the learner is not enrolled in the course', async () => {
      prisma.assignment.findUnique.mockResolvedValueOnce({ courseId: 'crs-1' });
      enrollments.isEnrolled.mockResolvedValueOnce(false);
      await expect(service.submit('user-1', 'asg-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('upserts the submission and clears any prior grade on resubmission', async () => {
      prisma.assignment.findUnique.mockResolvedValueOnce({ courseId: 'crs-1' });
      enrollments.isEnrolled.mockResolvedValueOnce(true);
      prisma.assignmentSubmission.upsert.mockResolvedValueOnce({});
      prisma.assignment.findUniqueOrThrow.mockResolvedValueOnce(assignmentRow());

      await service.submit('user-1', 'asg-1', { note: 'My answer' });

      expect(prisma.assignmentSubmission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignmentId_userId: { assignmentId: 'asg-1', userId: 'user-1' } },
          update: expect.objectContaining({ grade: null, feedback: null, gradedAt: null }),
        }),
      );
    });
  });

  describe('grade', () => {
    it('sets grade/feedback/gradedAt and notifies the submission owner', async () => {
      prisma.assignmentSubmission.update.mockResolvedValueOnce({
        userId: 'user-1',
        grade: 'B+',
        feedback: 'Good, but check part 2.',
        gradedAt: new Date('2026-09-13T00:00:00.000Z'),
        assignment: { title: 'Set up your first cloud account' },
      });

      const result = await service.grade('sub-1', { grade: 'B+', feedback: 'Good, but check part 2.' });

      expect(result).toEqual({
        grade: 'B+',
        feedback: 'Good, but check part 2.',
        gradedAt: '2026-09-13T00:00:00.000Z',
      });
      expect(notifications.create).toHaveBeenCalledWith(
        'user-1',
        'assignment',
        'Your assignment was graded: Set up your first cloud account',
        'Grade: B+ -- Good, but check part 2.',
        '/portal/assignments',
      );
    });
  });
});
