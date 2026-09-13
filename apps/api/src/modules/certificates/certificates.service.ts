import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Certificate } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';
import type { CertificatePdfInput } from './certificate-pdf.service';

const CERTIFICATE_SELECT = {
  id: true,
  credentialId: true,
  holderName: true,
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

  /** Scoped to the caller so one learner can't fetch another's certificate (e.g. for the PDF endpoint) by guessing an id. */
  async getOwned(userId: string, certificateId: string): Promise<Certificate> {
    const row = await this.prisma.certificate.findFirst({
      where: { id: certificateId, userId },
      select: CERTIFICATE_SELECT,
    });
    if (!row) throw new NotFoundException('Certificate not found.');
    return toCertificate(row);
  }

  /** Public lookup for the /verify page and its PDF link -- no auth, keyed by the credential id rather than the internal uuid. Safe to expose: CERTIFICATE_SELECT never includes userId. */
  async getByCredentialId(credentialId: string): Promise<Certificate> {
    const row = await this.prisma.certificate.findUnique({
      where: { credentialId },
      select: CERTIFICATE_SELECT,
    });
    if (!row) throw new NotFoundException('No certificate found for this credential ID.');
    return toCertificate(row);
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

    // A certificate's whole purpose is naming who earned it -- can't issue
    // one for an account that never set a name (e.g. an OAuth signup that
    // skipped Profile). Snapshotted onto the row rather than joined live at
    // read time, since a certificate is a fixed historical record: it must
    // keep showing the name as it was on the day it was earned even if the
    // learner renames themselves afterwards.
    const profile = await this.prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });
    const holderName = profile?.name?.trim();
    if (!holderName) {
      throw new BadRequestException(
        'This learner has no name on their profile yet -- ask them to set one before issuing a certificate.',
      );
    }

    const row = await this.prisma.certificate.create({
      data: { userId: targetUserId, courseId: course.id, credentialId: generateCredentialId(), holderName },
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

/** Shared by both the learner's own PDF endpoint and the public verify page's PDF link. */
export function toPdfInput(cert: Certificate): CertificatePdfInput {
  return {
    holderName: cert.holderName,
    courseTitle: cert.course.title,
    credentialId: cert.credentialId,
    issuedAt: new Date(cert.issuedAt),
  };
}

function generateCredentialId(): string {
  return `AIIT-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function toCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    credentialId: row.credentialId,
    holderName: row.holderName,
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
