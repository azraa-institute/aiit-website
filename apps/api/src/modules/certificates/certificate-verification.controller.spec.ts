import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CertificateVerificationController } from './certificate-verification.controller';
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

describe('CertificateVerificationController', () => {
  let controller: CertificateVerificationController;
  let certificates: { getByCredentialId: jest.Mock };
  let pdf: { render: jest.Mock };

  beforeEach(async () => {
    certificates = { getByCredentialId: jest.fn() };
    pdf = { render: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [CertificateVerificationController],
      providers: [
        { provide: CertificatesService, useValue: certificates },
        { provide: CertificatePdfService, useValue: pdf },
      ],
    }).compile();

    controller = moduleRef.get(CertificateVerificationController);
  });

  it('delegates to CertificatesService.getByCredentialId with no auth needed', async () => {
    certificates.getByCredentialId.mockResolvedValueOnce(CERTIFICATE);
    await expect(controller.verify('AIIT-AB12CD34')).resolves.toEqual(CERTIFICATE);
    expect(certificates.getByCredentialId).toHaveBeenCalledWith('AIIT-AB12CD34');
  });

  describe('pdf', () => {
    it('looks up by credential id, renders, and sets download headers', async () => {
      certificates.getByCredentialId.mockResolvedValueOnce(CERTIFICATE);
      pdf.render.mockResolvedValueOnce(Buffer.from('%PDF-fake'));
      const res = { set: jest.fn() };

      const file = await controller.pdf('AIIT-AB12CD34', res as never);

      expect(certificates.getByCredentialId).toHaveBeenCalledWith('AIIT-AB12CD34');
      expect(pdf.render).toHaveBeenCalledWith(expect.objectContaining({ holderName: 'Ada Lovelace' }));
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Disposition': expect.stringContaining('AIIT-AB12CD34') }),
      );
      expect(file).toBeInstanceOf(StreamableFile);
    });
  });
});
