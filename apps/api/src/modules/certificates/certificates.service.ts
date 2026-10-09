import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminCertificateRow, Certificate, Paginated } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapDomain, mapLevel } from '../courses/catalogue.mappers';
import type { CertificatePdfInput } from './certificate-pdf.service';

const CERTIFICATE_SELECT = {
  id: true,
  credentialId: true,
  holderName: true,
  issuedAt: true,
  revokedAt: true,
  revokedReason: true,
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
    private readonly audit: AuditService,
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

  /** @Roles('admin') at the controller. Browse-all view, separate from the per-student issuance in AdminStudentsPage's drawer -- this is where an admin finds a specific certificate without knowing which student it belongs to. */
  async adminList(query: { q?: string; status?: 'active' | 'revoked'; page?: number; pageSize?: number }): Promise<Paginated<AdminCertificateRow>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.CertificateWhereInput = {};
    if (query.status === 'active') where.revokedAt = null;
    if (query.status === 'revoked') where.revokedAt = { not: null };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { holderName: { contains: q, mode: 'insensitive' } },
        { credentialId: { contains: q, mode: 'insensitive' } },
        { course: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where,
        select: {
          id: true,
          credentialId: true,
          holderName: true,
          userId: true,
          issuedAt: true,
          revokedAt: true,
          revokedReason: true,
          course: { select: { title: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    const emails = await this.emailsFor(rows.map((r) => r.userId));
    return {
      items: rows.map((r) => ({
        id: r.id,
        credentialId: r.credentialId,
        holderName: r.holderName,
        holderEmail: emails.get(r.userId) ?? null,
        courseTitle: r.course.title,
        issuedAt: r.issuedAt.toISOString(),
        revokedAt: r.revokedAt?.toISOString() ?? null,
        revokedReason: r.revokedReason,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** @Roles('admin') at the controller. Keeps the row (and its credential id resolvable on the public verify page) rather than deleting it -- see the schema comment on Certificate.revokedAt. */
  async revoke(id: string, reason: string, adminId: string): Promise<Certificate> {
    const existing = await this.prisma.certificate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Certificate not found.');
    if (existing.revokedAt) throw new ConflictException('This certificate has already been revoked.');

    const row = await this.prisma.certificate.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason.trim() },
      select: CERTIFICATE_SELECT,
    });
    await this.audit.record(adminId, 'certificate.revoke', 'certificate', id, { reason: reason.trim() });
    return toCertificate(row);
  }

  /** Reverses an accidental or mistaken revoke -- the certificate goes back to showing as verified. */
  async unrevoke(id: string, adminId: string): Promise<Certificate> {
    const existing = await this.prisma.certificate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Certificate not found.');
    if (!existing.revokedAt) throw new ConflictException('This certificate is not revoked.');

    const row = await this.prisma.certificate.update({
      where: { id },
      data: { revokedAt: null, revokedReason: null },
      select: CERTIFICATE_SELECT,
    });
    await this.audit.record(adminId, 'certificate.unrevoke', 'certificate', id, {});
    return toCertificate(row);
  }

  /** Same raw-SQL lookup admin-affiliates.service.ts/affiliates.service.ts use -- auth.users isn't a Prisma model, so email only ever comes from a direct query against it. */
  private async emailsFor(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(unique.map((i) => Prisma.sql`${i}::uuid`))})`;
    return new Map(rows.filter((r) => r.email).map((r) => [r.id, r.email as string]));
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
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedReason: row.revokedReason,
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
