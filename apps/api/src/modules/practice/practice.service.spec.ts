import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { PracticeService } from './practice.service';

const COURSE = {
  id: 'crs-1',
  slug: 'digital-and-tech-literacy-absolute-beginner',
  title: 'Digital & Tech Literacy (Absolute Beginner)',
  image: '/course.jpg',
  level: 'beginner',
  pricing: 'free',
  domain: null,
};

describe('PracticeService', () => {
  let service: PracticeService;
  let prisma: {
    enrollment: { findMany: jest.Mock };
    quiz: { findMany: jest.Mock; findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    quizAttempt: { create: jest.Mock };
    quizQuestion: { deleteMany: jest.Mock };
    courseInstructor: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let enrollments: { isEnrolled: jest.Mock };

  beforeEach(async () => {
    prisma = {
      enrollment: { findMany: jest.fn() },
      quiz: { findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      quizAttempt: { create: jest.fn() },
      quizQuestion: { deleteMany: jest.fn() },
      courseInstructor: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    enrollments = { isEnrolled: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
      ],
    }).compile();

    service = moduleRef.get(PracticeService);
  });

  describe('listForUser', () => {
    it('returns an empty list when the learner has no active/completed enrollments', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([]);
      const result = await service.listForUser('user-1');
      expect(result).toEqual([]);
      expect(prisma.quiz.findMany).not.toHaveBeenCalled();
    });

    it('maps quizzes with the caller\'s own attempt count and best score', async () => {
      prisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 'crs-1' }]);
      prisma.quiz.findMany.mockResolvedValueOnce([
        {
          id: 'quiz-1',
          title: 'Module 1 check',
          description: null,
          course: COURSE,
          _count: { questions: 3 },
          attempts: [{ scorePct: 60 }, { scorePct: 90 }],
        },
      ]);

      const result = await service.listForUser('user-1');

      expect(result).toEqual([
        {
          id: 'quiz-1',
          title: 'Module 1 check',
          description: null,
          questionCount: 3,
          course: expect.objectContaining({ id: 'crs-1', level: 'Beginner' }),
          attempts: 2,
          bestScorePct: 90,
        },
      ]);
    });
  });

  describe('getForTaking', () => {
    it('throws NotFoundException for a missing quiz', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(null);
      await expect(service.getForTaking('user-1', 'quiz-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the learner is not enrolled in the quiz\'s course', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', title: 't', description: null, courseId: 'crs-1', course: COURSE, questions: [] });
      enrollments.isEnrolled.mockResolvedValueOnce(false);
      await expect(service.getForTaking('user-1', 'quiz-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the quiz with questions/options, no isCorrect leaked', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({
        id: 'quiz-1',
        title: 'Module 1 check',
        description: null,
        courseId: 'crs-1',
        course: COURSE,
        questions: [{ id: 'q-1', prompt: 'What is 2+2?', options: [{ id: 'o-1', text: '4' }, { id: 'o-2', text: '5' }] }],
      });
      enrollments.isEnrolled.mockResolvedValueOnce(true);

      const result = await service.getForTaking('user-1', 'quiz-1');

      expect(result.questions).toEqual([
        { id: 'q-1', prompt: 'What is 2+2?', options: [{ id: 'o-1', text: '4' }, { id: 'o-2', text: '5' }] },
      ]);
    });
  });

  describe('submitAttempt', () => {
    const QUIZ_FOR_SCORING = {
      courseId: 'crs-1',
      questions: [
        { id: 'q-1', options: [{ id: 'o-1', isCorrect: true }, { id: 'o-2', isCorrect: false }] },
        { id: 'q-2', options: [{ id: 'o-3', isCorrect: false }, { id: 'o-4', isCorrect: true }] },
      ],
    };

    it('throws NotFoundException for a missing quiz', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(null);
      await expect(service.submitAttempt('user-1', 'quiz-1', { answers: [] })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when not enrolled', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(QUIZ_FOR_SCORING);
      enrollments.isEnrolled.mockResolvedValueOnce(false);
      await expect(service.submitAttempt('user-1', 'quiz-1', { answers: [] })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('scores correct/incorrect/unanswered questions and persists the attempt', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(QUIZ_FOR_SCORING);
      enrollments.isEnrolled.mockResolvedValueOnce(true);
      prisma.quizAttempt.create.mockResolvedValueOnce({ id: 'attempt-1' });

      const result = await service.submitAttempt('user-1', 'quiz-1', {
        answers: [{ questionId: 'q-1', optionId: 'o-1' }, { questionId: 'q-2', optionId: 'o-3' }],
      });

      expect(result).toEqual({
        attemptId: 'attempt-1',
        scorePct: 50,
        correctCount: 1,
        totalQuestions: 2,
        results: [
          { questionId: 'q-1', selectedOptionId: 'o-1', correctOptionId: 'o-1', correct: true },
          { questionId: 'q-2', selectedOptionId: 'o-3', correctOptionId: 'o-4', correct: false },
        ],
      });
      expect(prisma.quizAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quizId: 'quiz-1', userId: 'user-1', scorePct: 50, correctCount: 1, totalQuestions: 2 }) }),
      );
    });

    it('treats an unanswered question as incorrect, not a crash', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(QUIZ_FOR_SCORING);
      enrollments.isEnrolled.mockResolvedValueOnce(true);
      prisma.quizAttempt.create.mockResolvedValueOnce({ id: 'attempt-1' });

      const result = await service.submitAttempt('user-1', 'quiz-1', { answers: [{ questionId: 'q-1', optionId: 'o-1' }] });

      expect(result.results[1]).toEqual({ questionId: 'q-2', selectedOptionId: null, correctOptionId: 'o-4', correct: false });
      expect(result.scorePct).toBe(50);
    });
  });

  describe('assertTeaches', () => {
    it('throws ForbiddenException when the instructor does not teach the course', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValueOnce(null);
      await expect(service.assertTeaches('instr-1', 'crs-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('resolves when the instructor does teach the course', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValueOnce({ courseId: 'crs-1' });
      await expect(service.assertTeaches('instr-1', 'crs-1')).resolves.toBeUndefined();
    });
  });

  describe('listForInstructor', () => {
    it('throws ForbiddenException when the instructor does not teach the course', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValueOnce(null);
      await expect(service.listForInstructor('instr-1', 'crs-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.quiz.findMany).not.toHaveBeenCalled();
    });

    it('maps quiz rows for the course the instructor teaches', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValueOnce({ courseId: 'crs-1' });
      prisma.quiz.findMany.mockResolvedValueOnce([
        {
          id: 'quiz-1',
          courseId: 'crs-1',
          title: 'Module 1 check',
          description: null,
          createdAt: new Date('2026-09-13T00:00:00.000Z'),
          course: { title: COURSE.title },
          _count: { questions: 3, attempts: 5 },
        },
      ]);

      const result = await service.listForInstructor('instr-1', 'crs-1');

      expect(result).toEqual([
        {
          id: 'quiz-1',
          courseId: 'crs-1',
          courseTitle: COURSE.title,
          title: 'Module 1 check',
          description: null,
          questionCount: 3,
          attempts: 5,
          createdAt: '2026-09-13T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('createQuiz', () => {
    it('throws ForbiddenException when the instructor does not teach the course', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createQuiz('instr-1', 'crs-1', { title: 't', questions: [] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('creates the quiz with nested questions/options, then returns it via getQuizForEditing', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValue({ courseId: 'crs-1' });
      prisma.quiz.create.mockResolvedValueOnce({ id: 'quiz-1' });
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.quiz.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'quiz-1',
        courseId: 'crs-1',
        title: 'Module 1 check',
        description: null,
        createdAt: new Date('2026-09-13T00:00:00.000Z'),
        course: { title: COURSE.title },
        _count: { attempts: 0 },
        questions: [{ prompt: 'Q1', options: [{ text: 'A', isCorrect: true }] }],
      });

      const result = await service.createQuiz('instr-1', 'crs-1', {
        title: 'Module 1 check',
        questions: [{ prompt: 'Q1', options: [{ text: 'A', isCorrect: true }] }],
      });

      expect(prisma.quiz.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: 'crs-1',
            title: 'Module 1 check',
            createdBy: 'instr-1',
            questions: { create: [{ prompt: 'Q1', position: 0, options: { create: [{ text: 'A', isCorrect: true, position: 0 }] } }] },
          }),
        }),
      );
      expect(result.id).toBe('quiz-1');
    });
  });

  describe('getQuizForEditing', () => {
    it('throws NotFoundException when the quiz does not exist', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(null);
      await expect(service.getQuizForEditing('instr-1', 'quiz-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the instructor does not teach the quiz\'s course', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.courseInstructor.findUnique.mockResolvedValueOnce(null);
      await expect(service.getQuizForEditing('instr-1', 'quiz-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateQuiz', () => {
    it('replaces the question set in a transaction, then returns the quiz via getQuizForEditing', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.courseInstructor.findUnique.mockResolvedValue({ courseId: 'crs-1' });
      prisma.$transaction.mockResolvedValueOnce([]);
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.quiz.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'quiz-1',
        courseId: 'crs-1',
        title: 'Updated',
        description: null,
        createdAt: new Date('2026-09-13T00:00:00.000Z'),
        course: { title: COURSE.title },
        _count: { attempts: 0 },
        questions: [],
      });

      const result = await service.updateQuiz('instr-1', 'quiz-1', { title: 'Updated', questions: [] });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteQuiz', () => {
    it('throws ForbiddenException when the instructor does not teach the quiz\'s course', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.courseInstructor.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteQuiz('instr-1', 'quiz-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });

    it('deletes the quiz once ownership is confirmed', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce({ id: 'quiz-1', courseId: 'crs-1' });
      prisma.courseInstructor.findUnique.mockResolvedValueOnce({ courseId: 'crs-1' });
      await service.deleteQuiz('instr-1', 'quiz-1');
      expect(prisma.quiz.delete).toHaveBeenCalledWith({ where: { id: 'quiz-1' } });
    });
  });
});
