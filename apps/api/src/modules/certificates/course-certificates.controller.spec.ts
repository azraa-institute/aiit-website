import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CourseCertificatesController } from './course-certificates.controller';
import { CertificatesService } from './certificates.service';

describe('CourseCertificatesController', () => {
  let controller: CourseCertificatesController;
  let certificates: { issue: jest.Mock };

  beforeEach(async () => {
    certificates = { issue: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [CourseCertificatesController],
      providers: [
        { provide: CertificatesService, useValue: certificates },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(CourseCertificatesController);
  });

  it('delegates to CertificatesService.issue with the slug and target user id', async () => {
    certificates.issue.mockResolvedValueOnce({});
    await controller.issue('digital-and-tech-literacy-absolute-beginner', { userId: 'user-1' });
    expect(certificates.issue).toHaveBeenCalledWith('digital-and-tech-literacy-absolute-beginner', 'user-1');
  });
});
