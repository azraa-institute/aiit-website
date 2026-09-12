import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CertificatesService } from './certificates.service';

const CERTIFICATE_ROW = {
  id: 'cert-1',
  credentialId: 'AIIT-AB12CD34',
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

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: {
    course: { findFirst: jest.Mock };
    certificate: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  };
  let enrollments: { markCompleted: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: { findFirst: jest.fn() },
      certificate: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    };
    enrollments = { markCompleted: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollments },
      ],
    }).compile();

    service = moduleRef.get(CertificatesService);
  });

  describe('listForUser', () => {
    it('maps certificate rows with embedded course display fields', async () => {
      prisma.certificate.findMany.mockResolvedValueOnce([CERTIFICATE_ROW]);
      const result = await service.listForUser('user-1');
      expect(result).toEqual([
        {
          id: 'cert-1',
          credentialId: 'AIIT-AB12CD34',
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
        },
      ]);
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

    it('creates the certificate and marks the enrollment completed', async () => {
      prisma.course.findFirst.mockResolvedValueOnce({ id: 'crs-1' });
      prisma.certificate.findUnique.mockResolvedValueOnce(null);
      prisma.certificate.create.mockResolvedValueOnce(CERTIFICATE_ROW);

      const result = await service.issue('digital-and-tech-literacy-absolute-beginner', 'user-1');

      expect(prisma.certificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', courseId: 'crs-1' }),
        }),
      );
      expect(enrollments.markCompleted).toHaveBeenCalledWith('user-1', 'crs-1');
      expect(result.credentialId).toBe('AIIT-AB12CD34');
    });
  });
});
