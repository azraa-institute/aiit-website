import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { WebinarService } from './webinar.service';
import type { RegisterWebinarDto } from './dto/register-webinar.dto';

describe('WebinarService', () => {
  let service: WebinarService;
  let prisma: { webinarRegistration: { findUnique: jest.Mock; create: jest.Mock } };
  let email: { send: jest.Mock };

  const DTO: RegisterWebinarDto = {
    webinarSlug: 'mastering-modern-information-technology',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    region: 'west-africa',
    persona: 'student',
    turnstileToken: 'tok',
  };

  beforeEach(async () => {
    prisma = {
      webinarRegistration: { findUnique: jest.fn(), create: jest.fn() },
    };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebinarService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(WebinarService);
  });

  it('creates a registration and notifies staff when none exists yet', async () => {
    prisma.webinarRegistration.findUnique.mockResolvedValueOnce(null);

    await service.register(DTO);

    expect(prisma.webinarRegistration.findUnique).toHaveBeenCalledWith({
      where: { email_webinarSlug: { email: DTO.email, webinarSlug: DTO.webinarSlug } },
    });
    expect(prisma.webinarRegistration.create).toHaveBeenCalled();
    expect(email.send).toHaveBeenCalled();
  });

  it('is idempotent -- an existing registration is not duplicated or re-notified', async () => {
    prisma.webinarRegistration.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await service.register(DTO);

    expect(prisma.webinarRegistration.create).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });
});
