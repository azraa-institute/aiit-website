import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MyCertificatesController } from './my-certificates.controller';
import { CertificatesService } from './certificates.service';

describe('MyCertificatesController', () => {
  let controller: MyCertificatesController;
  let certificates: { listForUser: jest.Mock };

  beforeEach(async () => {
    certificates = { listForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyCertificatesController],
      providers: [
        { provide: CertificatesService, useValue: certificates },
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
});
