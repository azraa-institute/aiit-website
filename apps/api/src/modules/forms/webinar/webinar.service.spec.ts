import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { WebinarNotificationsService } from '../../webinars/webinar-notifications.service';
import { WebinarService } from './webinar.service';
import type { RegisterWebinarDto } from './dto/register-webinar.dto';

describe('WebinarService', () => {
  let service: WebinarService;
  let prisma: { webinarRegistration: { findUnique: jest.Mock; create: jest.Mock }; webinar: { findUnique: jest.Mock } };
  let email: { send: jest.Mock };
  let notifications: { sendConfirmation: jest.Mock };

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
      webinar: { findUnique: jest.fn() },
    };
    email = { send: jest.fn() };
    notifications = { sendConfirmation: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebinarService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: WebinarNotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(WebinarService);
  });

  it('creates a registration, links it to the real Webinar, and sends a confirmation + staff notification', async () => {
    prisma.webinarRegistration.findUnique.mockResolvedValueOnce(null);
    prisma.webinar.findUnique.mockResolvedValueOnce({ id: 'webinar-1', slug: DTO.webinarSlug });
    prisma.webinarRegistration.create.mockResolvedValueOnce({ id: 'reg-1', email: DTO.email });

    await service.register(DTO);

    expect(prisma.webinarRegistration.findUnique).toHaveBeenCalledWith({
      where: { email_webinarSlug: { email: DTO.email, webinarSlug: DTO.webinarSlug } },
    });
    expect(prisma.webinarRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ webinarId: 'webinar-1' }) }),
    );
    expect(notifications.sendConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reg-1' }),
      expect.objectContaining({ id: 'webinar-1' }),
    );
    expect(email.send).toHaveBeenCalled();
  });

  it('still saves the registration (no confirmation email) if the slug matches no real Webinar row', async () => {
    prisma.webinarRegistration.findUnique.mockResolvedValueOnce(null);
    prisma.webinar.findUnique.mockResolvedValueOnce(null);
    prisma.webinarRegistration.create.mockResolvedValueOnce({ id: 'reg-2', email: DTO.email });

    await service.register(DTO);

    expect(prisma.webinarRegistration.create).toHaveBeenCalled();
    expect(notifications.sendConfirmation).not.toHaveBeenCalled();
    expect(email.send).toHaveBeenCalled();
  });

  it('is idempotent -- an existing registration is not duplicated or re-notified', async () => {
    prisma.webinarRegistration.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await service.register(DTO);

    expect(prisma.webinarRegistration.create).not.toHaveBeenCalled();
    expect(notifications.sendConfirmation).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });
});
