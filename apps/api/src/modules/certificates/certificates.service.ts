import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Certificate } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';

const CERTIFICATE_SELECT = {
  id: true,
  credentialId: true,
  issuedAt: true,
  course: {
    select: { id: true, slug: true, title: true, image: true, level: true, pricing: true, domain: true },
  },
} satisfies Prisma.CertificateSelect;

type CertificateRow = Prisma.CertificateGetPayload<{ select: typeof CERTIFICATE_SELECT }>;

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForUser(userId: string): Promise<Certificate[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      select: CERTIFICATE_SELECT,
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map(toCertificate);
  }

  /** @Roles('admin') at the controller. Also marks the learner's enrollment completed -- completion and credentialing are one authoritative action, not a learner self-report. */
  async issue(courseSlug: string, targetUserId: string): Promise<Certificate> {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug, status: 'published', deletedAt: null },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId: targetUserId, courseId: course.id } },
    });
    if (existing) throw new ConflictException('A certificate for this learner and course already exists.');

    const row = await this.prisma.certificate.create({
      data: { userId: targetUserId, courseId: course.id, credentialId: generateCredentialId() },
      select: CERTIFICATE_SELECT,
    });

    await this.enrollments.markCompleted(targetUserId, course.id);

    await this.notifications.create(
      targetUserId,
      'certificate',
      `Certificate earned: ${row.course.title}`,
      undefined,
      '/portal/certificates',
    );

    return toCertificate(row);
  }
}

function generateCredentialId(): string {
  return `AIIT-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function toCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    credentialId: row.credentialId,
    issuedAt: row.issuedAt.toISOString(),
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
