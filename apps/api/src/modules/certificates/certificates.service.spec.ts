import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Certificate } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CertificatesService, toPdfInput } from './certificates.service';

const CERTIFICATE_ROW = {
  id: 'cert-1',
  credentialId: 'AIIT-AB12CD34',
  holderName: 'Ada Lovelace',
  issuedAt: new Date('2026-09-13T00:00:00.000Z'),
  course: {
    id: 'crs-1',
    slug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Digital & Tech Literacy (Absolute Beginner)',
    image: '/course.jpg',
    level: 'beginner',
    pricing: 'free',
    domain: null,
  },
};

const CERTIFICATE_SHAPE: Certificate = {
  id: 'cert-1',
  credentialId: 'AIIT-AB12CD34',
  holderName: 'Ada Lovelace',
  issuedAt: '2026-09-13T00:00:00.000Z',
  course: {
    id: 'crs-1',
    slug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Digital & Tech Literacy (Absolute Beginner)',
    image: '/course.jpg',
    level: 'Beginner',
    pricing: 'free',
    domain: null,
  },
};

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: {
    course: { findFirst: jest.Mock };
    certificate: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    profile: { findUnique: jest.Mock };
  };
  let enrollments: { markCompleted: jest.Mock };
  let notifications: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: { findFirst: jest.fn() },
      certificate: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      profile: { findUnique: jest.fn() },
    };
    enrollments = { markCompleted: jest.fn() };
    notifications = { create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(CertificatesService);
  });

  describe('listForUser', () => {
    it('maps certificate rows with embedded course display fields', async () => {
      prisma.certificate.findMany.mockResolvedValueOnce([CERTIFICATE_ROW]);
      const result = await service.listForUser('user-1');
      expect(result).toEqual([CERTIFICATE_SHAPE]);
    });
  });

  describe('getOwned', () => {
    it('returns the certificate when it belongs to the caller', async () => {
      prisma.certificate.findFirst.mockResolvedValueOnce(CERTIFICATE_ROW);
      const result = await service.getOwned('user-1', 'cert-1');
      expect(prisma.certificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cert-1', userId: 'user-1' } }),
      );
      expect(result).toEqual(CERTIFICATE_SHAPE);
    });

    it('throws NotFoundException when the certificate does not belong to the caller (or does not exist)', async () => {
      prisma.certificate.findFirst.mockResolvedValueOnce(null);
      await expect(service.getOwned('someone-else', 'cert-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getByCredentialId', () => {
    it('returns the certificate for a real credential id', async () => {
      prisma.certificate.findUnique.mockResolvedValueOnce(CERTIFICATE_ROW);
      const result = await service.getByCredentialId('AIIT-AB12CD34');
      expect(result).toEqual(CERTIFICATE_SHAPE);
    });

    it('throws NotFoundException for an unknown credential id', async () => {
      prisma.certificate.findUnique.mockResolvedValueOnce(null);
      await expect(service.getByCredentialId('AIIT-BOGUS')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('issue', () => {
    it('throws NotFoundException for a missing/unpublished course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.issue('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when a certificate already exists for this learner+course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1' });
      prisma.certificate.findUnique.mockResolvedValueOnce({ id: 'cert-1' });
      await expect(
        service.issue('digital-and-tech-literacy-absolute-beginner', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException when the learner has no name on their profile', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1' });
      prisma.certificate.findUnique.mockResolvedValueOnce(null);
      prisma.profile.findUnique.mockResolvedValueOnce({ name: null });
      await expect(
        service.issue('digital-and-tech-literacy-absolute-beginner', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.certificate.create).not.toHaveBeenCalled();
    });

    it('creates the certificate (snapshotting the profile name), marks the enrollment completed, and notifies', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1' });
      prisma.certificate.findUnique.mockResolvedValueOnce(null);
      prisma.profile.findUnique.mockResolvedValueOnce({ name: 'Ada Lovelace' });
      prisma.certificate.create.mockResolvedValueOnce(CERTIFICATE_ROW);

      const result = await service.issue('digital-and-tech-literacy-absolute-beginner', 'user-1');

      expect(prisma.certificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', courseId: 'crs-1', holderName: 'Ada Lovelace' }),
        }),
      );
      expect(enrollments.markCompleted).toHaveBeenCalledWith('user-1', 'crs-1');
      expect(notifications.create).toHaveBeenCalledWith(
        'user-1',
        'certificate',
        'Certificate earned: Digital & Tech Literacy (Absolute Beginner)',
        undefined,
        '/portal/certificates',
      );
      expect(result.credentialId).toBe('AIIT-AB12CD34');
    });
  });
});

describe('toPdfInput', () => {
  it('maps a Certificate onto the PDF renderer input shape', () => {
    expect(toPdfInput(CERTIFICATE_SHAPE)).toEqual({
      holderName: 'Ada Lovelace',
      courseTitle: 'Digital & Tech Literacy (Absolute Beginner)',
      credentialId: 'AIIT-AB12CD34',
      issuedAt: new Date('2026-09-13T00:00:00.000Z'),
    });
  });
});
