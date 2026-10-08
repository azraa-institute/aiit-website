import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  InstructorQuizDetail,
  InstructorQuizSummary,
  QuizAnswerResult,
  QuizAttemptResult,
  QuizDetail,
  QuizSummary,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';
import type { CreateQuizDto, SubmitQuizAttemptDto, UpdateQuizDto } from './dto/practice.dto';

const COURSE_SELECT = {
  id: true,
  slug: true,
  title: true,
  image: true,
  level: true,
  pricing: true,
  domain: true,
} satisfies Prisma.CourseSelect;

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  // ---- Learner: list + take ----

  async listForUser(userId: string): Promise<QuizSummary[]> {
    const enrolled = await this.prisma.enrollment.findMany({
      where: { userId, status: { in: ['active', 'completed'] } },
      select: { courseId: true },
    });
    const courseIds = enrolled.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        course: { select: COURSE_SELECT },
        _count: { select: { questions: true } },
        attempts: { where: { userId }, select: { scorePct: true } },
      },
    });

    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionCount: q._count.questions,
      course: toCourseSummary(q.course),
      attempts: q.attempts.length,
      bestScorePct: q.attempts.length > 0 ? Math.max(...q.attempts.map((a) => a.scorePct)) : null,
    }));
  }

  async getForTaking(userId: string, quizId: string): Promise<QuizDetail> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        course: { select: COURSE_SELECT },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            prompt: true,
            options: { orderBy: { position: 'asc' }, select: { id: true, text: true } },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const enrolled = await this.enrollments.isEnrolled(userId, quiz.courseId);
    if (!enrolled) throw new ForbiddenException('You must be enrolled in this course to take this quiz.');

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      course: toCourseSummary(quiz.course),
      questions: quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    };
  }

  async submitAttempt(userId: string, quizId: string, dto: SubmitQuizAttemptDto): Promise<QuizAttemptResult> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        courseId: true,
        questions: {
          select: { id: true, options: { select: { id: true, isCorrect: true } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const enrolled = await this.enrollments.isEnrolled(userId, quiz.courseId);
    if (!enrolled) throw new ForbiddenException('You must be enrolled in this course to take this quiz.');

    const answerByQuestion = new Map(dto.answers.map((a) => [a.questionId, a.optionId]));
    const results: QuizAnswerResult[] = quiz.questions.map((q) => {
      const correctOption = q.options.find((o) => o.isCorrect);
      const selectedOptionId = answerByQuestion.get(q.id) ?? null;
      return {
        questionId: q.id,
        selectedOptionId,
        correctOptionId: correctOption?.id ?? '',
        correct: selectedOptionId !== null && selectedOptionId === correctOption?.id,
      };
    });
    const correctCount = results.filter((r) => r.correct).length;
    const totalQuestions = quiz.questions.length;
    const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        scorePct,
        correctCount,
        totalQuestions,
        answers: Object.fromEntries(dto.answers.map((a) => [a.questionId, a.optionId])),
      },
      select: { id: true },
    });

    return { attemptId: attempt.id, scorePct, correctCount, totalQuestions, results };
  }

  // ---- Instructor: author ----

  async assertTeaches(instructorId: string, courseId: string): Promise<void> {
    const row = await this.prisma.courseInstructor.findUnique({
      where: { courseId_instructorId: { courseId, instructorId } },
      select: { courseId: true },
    });
    if (!row) throw new ForbiddenException('You do not teach this course.');
  }

  private async quizFor(instructorId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true, courseId: true } });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    await this.assertTeaches(instructorId, quiz.courseId);
    return quiz;
  }

  async listForInstructor(instructorId: string, courseId: string): Promise<InstructorQuizSummary[]> {
    await this.assertTeaches(instructorId, courseId);
    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        createdAt: true,
        course: { select: { title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return quizzes.map((q) => ({
      id: q.id,
      courseId: q.courseId,
      courseTitle: q.course.title,
      title: q.title,
      description: q.description,
      questionCount: q._count.questions,
      attempts: q._count.attempts,
      createdAt: q.createdAt.toISOString(),
    }));
  }

  async createQuiz(instructorId: string, courseId: string, dto: CreateQuizDto): Promise<InstructorQuizDetail> {
    await this.assertTeaches(instructorId, courseId);
    const quiz = await this.prisma.quiz.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description ?? null,
        createdBy: instructorId,
        questions: {
          create: dto.questions.map((q, qi) => ({
            prompt: q.prompt,
            position: qi,
            options: { create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, position: oi })) },
          })),
        },
      },
      select: { id: true },
    });
    return this.getQuizForEditing(instructorId, quiz.id);
  }

  async getQuizForEditing(instructorId: string, quizId: string): Promise<InstructorQuizDetail> {
    await this.quizFor(instructorId, quizId);
    const quiz = await this.prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        createdAt: true,
        course: { select: { title: true } },
        _count: { select: { attempts: true } },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            prompt: true,
            options: { orderBy: { position: 'asc' }, select: { text: true, isCorrect: true } },
          },
        },
      },
    });
    return {
      id: quiz.id,
      courseId: quiz.courseId,
      courseTitle: quiz.course.title,
      title: quiz.title,
      description: quiz.description,
      questionCount: quiz.questions.length,
      attempts: quiz._count.attempts,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options })),
    };
  }

  /** Replaces the whole question set -- simpler and safer than diffing a partial patch against existing questions/options. */
  async updateQuiz(instructorId: string, quizId: string, dto: UpdateQuizDto): Promise<InstructorQuizDetail> {
    await this.quizFor(instructorId, quizId);
    await this.prisma.$transaction([
      this.prisma.quizQuestion.deleteMany({ where: { quizId } }),
      this.prisma.quiz.update({
        where: { id: quizId },
        data: {
          title: dto.title,
          description: dto.description ?? null,
          questions: {
            create: dto.questions.map((q, qi) => ({
              prompt: q.prompt,
              position: qi,
              options: { create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, position: oi })) },
            })),
          },
        },
      }),
    ]);
    return this.getQuizForEditing(instructorId, quizId);
  }

  async deleteQuiz(instructorId: string, quizId: string): Promise<void> {
    await this.quizFor(instructorId, quizId);
    await this.prisma.quiz.delete({ where: { id: quizId } });
  }
}

function toCourseSummary(course: Prisma.CourseGetPayload<{ select: typeof COURSE_SELECT }>) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    image: course.image,
    level: mapLevel(course.level),
    pricing: course.pricing,
    domain: course.domain ? mapDomain(course.domain) : null,
  };
}
