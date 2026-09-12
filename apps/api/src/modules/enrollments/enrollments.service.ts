import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Enrollment } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';

const ENROLLMENT_SELECT = {
  id: true,
  status: true,
  enrolledAt: true,
  completedAt: true,
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      image: true,
      level: true,
      pricing: true,
      domain: true,
    },
  },
} satisfies Prisma.EnrollmentSelect;

type EnrollmentRow = Prisma.EnrollmentGetPayload<{ select: typeof ENROLLMENT_SELECT }>;

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Enrollment[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId },
      select: ENROLLMENT_SELECT,
      orderBy: { enrolledAt: 'desc' },
    });
    return rows.map(toEnrollment);
  }

  /** Self-enrollment, free courses only -- paid courses need a checkout flow that doesn't exist yet. */
  async enroll(userId: string, slug: string): Promise<Enrollment> {
    const course = await this.prisma.course.findFirst({
      where: { slug, status: 'published', deletedAt: null },
      select: { id: true, pricing: true },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.pricing !== 'free') {
      throw new ForbiddenException(
        'This course requires payment, which is not available yet -- enrollment is currently open for free courses only.',
      );
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (existing && existing.status !== 'cancelled') {
      throw new ConflictException('You are already enrolled in this course.');
    }

    const row = existing
      ? await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: 'active', completedAt: null },
          select: ENROLLMENT_SELECT,
        })
      : await this.prisma.enrollment.create({
          data: { userId, courseId: course.id },
          select: ENROLLMENT_SELECT,
        });

    return toEnrollment(row);
  }

  /** Used by CertificatesService when an admin issues a credential -- ties completion to certification, not a learner self-report. */
  async markCompleted(userId: string, courseId: string): Promise<void> {
    await this.prisma.enrollment.updateMany({
      where: { userId, courseId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });
    return enrollment !== null && enrollment.status !== 'cancelled';
  }
}

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    status: row.status,
    enrolledAt: row.enrolledAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    course: {
      id: row.course.id,
      slug: row.course.slug,
      title: row.course.title,
      image: row.course.image,
      level: mapLevel(row.course.level),
      pricing: row.course.pricing,
      domain: row.course.domain ? mapDomain(row.course.domain) : null,
    },
  };
}
