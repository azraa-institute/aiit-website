import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MyCertificatesController } from './my-certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

const CERTIFICATE = {
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

describe('MyCertificatesController', () => {
  let controller: MyCertificatesController;
  let certificates: { listForUser: jest.Mock; getOwned: jest.Mock };
  let pdf: { render: jest.Mock };

  beforeEach(async () => {
    certificates = { listForUser: jest.fn(), getOwned: jest.fn() };
    pdf = { render: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyCertificatesController],
      providers: [
        { provide: CertificatesService, useValue: certificates },
        { provide: CertificatePdfService, useValue: pdf },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(MyCertificatesController);
  });

  it('delegates to CertificatesService.listForUser with the authenticated user id', async () => {
    certificates.listForUser.mockResolvedValueOnce([]);
    await expect(controller.list({ userId: 'user-1', role: 'learner' })).resolves.toEqual([]);
    expect(certificates.listForUser).toHaveBeenCalledWith('user-1');
  });

  describe('pdf', () => {
    it('fetches the caller-owned certificate, renders it, and sets download headers', async () => {
      certificates.getOwned.mockResolvedValueOnce(CERTIFICATE);
      pdf.render.mockResolvedValueOnce(Buffer.from('%PDF-fake'));
      const res = { set: jest.fn() };

      const file = await controller.pdf({ userId: 'user-1', role: 'learner' }, 'cert-1', res as never);

      expect(certificates.getOwned).toHaveBeenCalledWith('user-1', 'cert-1');
      expect(pdf.render).toHaveBeenCalledWith(
        expect.objectContaining({ holderName: 'Ada Lovelace', credentialId: 'AIIT-AB12CD34' }),
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': expect.stringContaining('AIIT-AB12CD34'),
        }),
      );
      expect(file).toBeInstanceOf(StreamableFile);
    });
  });
});
