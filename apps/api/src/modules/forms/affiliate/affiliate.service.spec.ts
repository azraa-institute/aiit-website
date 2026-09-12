import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { AffiliateService } from './affiliate.service';
import type { ApplyAffiliateDto } from './dto/apply-affiliate.dto';

describe('AffiliateService', () => {
  let service: AffiliateService;
  let prisma: { affiliateApplication: { create: jest.Mock } };
  let email: { send: jest.Mock };

  const DTO: ApplyAffiliateDto = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    turnstileToken: 'tok',
  };

  beforeEach(async () => {
    prisma = { affiliateApplication: { create: jest.fn() } };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AffiliateService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(AffiliateService);
  });

  it('stores the application and notifies staff', async () => {
    await service.apply(DTO);

    expect(prisma.affiliateApplication.create).toHaveBeenCalledWith({
      data: {
        name: DTO.name,
        email: DTO.email,
        phone: undefined,
        handle: undefined,
        country: undefined,
        city: undefined,
        referralCode: undefined,
        source: undefined,
        intent: undefined,
      },
    });
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'info@aiit.network' }));
  });

  it('only includes optional fields in the email when present', async () => {
    await service.apply({ ...DTO, country: 'Nigeria' });

    const call = email.send.mock.calls[0][0];
    expect(call.html).toContain('Nigeria');
    expect(call.html).not.toContain('Phone');
  });
});
