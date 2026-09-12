import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from './enrollments.service';

const DOMAIN = {
  id: 'dom-1',
  slug: 'digital-tech-literacy',
  name: 'Digital & Technology Literacy',
  tagline: 'Start from the very beginning.',
  summary: "AIIT's free entry-point course.",
  motif: 'field',
  order: 9,
  primary: false,
  image: '/img.jpg',
};

const ENROLLMENT_ROW = {
  id: 'enr-1',
  status: 'active',
  enrolledAt: new Date('2026-09-12T00:00:00.000Z'),
  completedAt: null,
  course: {
    id: 'crs-1',
    slug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Digital & Tech Literacy (Absolute Beginner)',
    image: '/course.jpg',
    level: 'beginner',
    pricing: 'free',
    domain: DOMAIN,
  },
};

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: {
    course: { findFirst: jest.Mock };
    enrollment: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      course: { findFirst: jest.fn() },
      enrollment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [EnrollmentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EnrollmentsService);
  });

  describe('listForUser', () => {
    it('maps enrollment rows with embedded course display fields', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([ENROLLMENT_ROW]);
      const result = await service.listForUser('user-1');

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toEqual([
        {
          id: 'enr-1',
          status: 'active',
          enrolledAt: '2026-09-12T00:00:00.000Z',
          completedAt: null,
          course: {
            id: 'crs-1',
            slug: 'digital-and-tech-literacy-absolute-beginner',
            title: 'Digital & Tech Literacy (Absolute Beginner)',
            image: '/course.jpg',
            level: 'Beginner',
            pricing: 'free',
            domain: {
              id: 'dom-1',
              slug: 'digital-tech-literacy',
              name: 'Digital & Technology Literacy',
              tagline: 'Start from the very beginning.',
              summary: "AIIT's free entry-point course.",
              motif: 'field',
              order: 9,
              primary: false,
              image: '/img.jpg',
            },
          },
        },
      ]);
    });
  });

  describe('enroll', () => {
    it('throws NotFoundException for a missing/unpublished course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.enroll('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for a paid course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1', pricing: 'paid' });
      await expect(service.enroll('user-1', 'ai-engineering')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a new enrollment for a free course with no prior enrollment', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1', pricing: 'free' });
      prisma.enrollment.findUnique.mockResolvedValueOnce(null);
      prisma.enrollment.create.mockResolvedValueOnce(ENROLLMENT_ROW);

      const result = await service.enroll('user-1', 'digital-and-tech-literacy-absolute-beginner');

      expect(prisma.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 'user-1', courseId: 'crs-1' } }),
      );
      expect(result.id).toBe('enr-1');
    });

    it('throws ConflictException when already actively enrolled', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1', pricing: 'free' });
      prisma.enrollment.findUnique.mockResolvedValueOnce({ id: 'enr-1', status: 'active' });
      await expect(service.enroll('user-1', 'digital-and-tech-literacy-absolute-beginner')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reactivates a cancelled enrollment instead of erroring', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1', pricing: 'free' });
      prisma.enrollment.findUnique.mockResolvedValueOnce({ id: 'enr-1', status: 'cancelled' });
      prisma.enrollment.update.mockResolvedValueOnce(ENROLLMENT_ROW);

      await service.enroll('user-1', 'digital-and-tech-literacy-absolute-beginner');

      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enr-1' },
          data: { status: 'active', completedAt: null },
        }),
      );
    });
  });

  describe('markCompleted', () => {
    it('sets status completed and a completedAt timestamp', async () => {
      prisma.enrollment.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.markCompleted('user-1', 'crs-1');
      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', courseId: 'crs-1' },
        data: { status: 'completed', completedAt: expect.any(Date) },
      });
    });
  });

  describe('isEnrolled', () => {
    it('returns false when no enrollment exists', async () => {
      prisma.enrollment.findUnique.mockResolvedValueOnce(null);
      await expect(service.isEnrolled('user-1', 'crs-1')).resolves.toBe(false);
    });

    it('returns false for a cancelled enrollment', async () => {
      prisma.enrollment.findUnique.mockResolvedValueOnce({ status: 'cancelled' });
      await expect(service.isEnrolled('user-1', 'crs-1')).resolves.toBe(false);
    });

    it('returns true for an active enrollment', async () => {
      prisma.enrollment.findUnique.mockResolvedValueOnce({ status: 'active' });
      await expect(service.isEnrolled('user-1', 'crs-1')).resolves.toBe(true);
    });
  });
});
