import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Assignment, AssignmentStatus } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';
import type { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import type { GradeSubmissionDto } from './dto/grade-submission.dto';

const ASSIGNMENT_COURSE_SELECT = {
  id: true,
  slug: true,
  title: true,
  image: true,
  level: true,
  pricing: true,
  domain: true,
} satisfies Prisma.CourseSelect;

const SUBMISSION_SELECT = {
  fileKey: true,
  note: true,
  submittedAt: true,
  grade: true,
  feedback: true,
  gradedAt: true,
} satisfies Prisma.AssignmentSubmissionSelect;

const ASSIGNMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  dueAt: true,
  course: { select: ASSIGNMENT_COURSE_SELECT },
  submissions: { select: SUBMISSION_SELECT },
} satisfies Prisma.AssignmentSelect;

type AssignmentRow = Prisma.AssignmentGetPayload<{ select: typeof ASSIGNMENT_SELECT }>;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForUser(userId: string): Promise<Assignment[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: { in: ['active', 'completed'] } },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const rows = await this.prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: { ...ASSIGNMENT_SELECT, submissions: { where: { userId }, select: SUBMISSION_SELECT } },
      orderBy: { dueAt: 'asc' },
    });

    return rows.map(toAssignment);
  }

  async submit(userId: string, assignmentId: string, dto: SubmitAssignmentDto): Promise<Assignment> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseId: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found.');

    const enrolled = await this.enrollments.isEnrolled(userId, assignment.courseId);
    if (!enrolled) {
      throw new ForbiddenException('You must be enrolled in this course to submit this assignment.');
    }

    // A resubmission clears any prior grade -- it hasn't been graded yet.
    await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId, userId } },
      create: { assignmentId, userId, fileKey: dto.fileKey, note: dto.note, submittedAt: new Date() },
      update: {
        fileKey: dto.fileKey ?? null,
        note: dto.note ?? null,
        submittedAt: new Date(),
        grade: null,
        feedback: null,
        gradedAt: null,
      },
    });

    return this.getOneForUser(userId, assignmentId);
  }

  /** @Roles('admin') at the controller -- not learner-callable. */
  async grade(
    submissionId: string,
    dto: GradeSubmissionDto,
  ): Promise<{ grade: string; feedback: string | null; gradedAt: string }> {
    const submission = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: dto.grade, feedback: dto.feedback, gradedAt: new Date() },
      select: {
        userId: true,
        grade: true,
        feedback: true,
        gradedAt: true,
        assignment: { select: { title: true } },
      },
    });

    await this.notifications.create(
      submission.userId,
      'assignment',
      `Your assignment was graded: ${submission.assignment.title}`,
      dto.feedback ? `Grade: ${dto.grade} -- ${dto.feedback}` : `Grade: ${dto.grade}`,
      '/portal/assignments',
    );

    return {
      grade: submission.grade!,
      feedback: submission.feedback,
      gradedAt: submission.gradedAt!.toISOString(),
    };
  }

  private async getOneForUser(userId: string, assignmentId: string): Promise<Assignment> {
    const row = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { ...ASSIGNMENT_SELECT, submissions: { where: { userId }, select: SUBMISSION_SELECT } },
    });
    return toAssignment(row);
  }
}

function deriveStatus(
  dueAt: Date | null,
  submission: { submittedAt: Date | null; gradedAt: Date | null } | undefined,
): AssignmentStatus {
  if (submission?.gradedAt) return 'graded';
  if (submission?.submittedAt) return 'submitted';
  if (dueAt && dueAt.getTime() < Date.now()) return 'overdue';
  return 'upcoming';
}

function toAssignment(row: AssignmentRow): Assignment {
  const submission = row.submissions[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    status: deriveStatus(row.dueAt, submission),
    course: {
      id: row.course.id,
      slug: row.course.slug,
      title: row.course.title,
      image: row.course.image,
      level: mapLevel(row.course.level),
      pricing: row.course.pricing,
      domain: row.course.domain ? mapDomain(row.course.domain) : null,
    },
    submission: submission
      ? {
          fileKey: submission.fileKey,
          note: submission.note,
          submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
          grade: submission.grade,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt ? submission.gradedAt.toISOString() : null,
        }
      : null,
  };
}
