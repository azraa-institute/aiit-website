import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { WebinarNotificationsService } from './webinar-notifications.service';

const WEBINAR = {
  id: 'webinar-1',
  title: 'Mastering Modern Tech',
  scheduleNote: 'To be announced',
  startsAt: new Date('2026-12-01T10:00:00Z'),
  joinUrl: 'https://zoom.us/j/123',
};

describe('WebinarNotificationsService', () => {
  let service: WebinarNotificationsService;
  let prisma: {
    webinar: { findUnique: jest.Mock };
    webinarRegistration: { findMany: jest.Mock; update: jest.Mock };
  };
  let email: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      webinar: { findUnique: jest.fn() },
      webinarRegistration: { findMany: jest.fn(), update: jest.fn() },
    };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebinarNotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(WebinarNotificationsService);
  });

  describe('sendConfirmation', () => {
    it('emails the registrant and records confirmationSentAt', async () => {
      const registration = { id: 'reg-1', email: 'ada@example.com' };
      await service.sendConfirmation(registration as never, WEBINAR as never);

      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }));
      expect(prisma.webinarRegistration.update).toHaveBeenCalledWith({
        where: { id: 'reg-1' },
        data: { confirmationSentAt: expect.any(Date) },
      });
    });

    it('does not throw, and leaves confirmationSentAt unset, if the email send itself fails', async () => {
      email.send.mockRejectedValueOnce(new Error('network down'));
      const registration = { id: 'reg-1', email: 'ada@example.com' };

      await expect(service.sendConfirmation(registration as never, WEBINAR as never)).resolves.toBeUndefined();
      expect(prisma.webinarRegistration.update).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders', () => {
    it('no-ops (0 sent) when the webinar has no join link set yet', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce({ ...WEBINAR, joinUrl: null });
      const sent = await service.sendReminders('webinar-1', '24h');
      expect(sent).toBe(0);
      expect(prisma.webinarRegistration.findMany).not.toHaveBeenCalled();
    });

    it('only queries registrations missing that specific reminder field (not force)', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(WEBINAR);
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([]);

      await service.sendReminders('webinar-1', '30m');

      expect(prisma.webinarRegistration.findMany).toHaveBeenCalledWith({
        where: { webinarId: 'webinar-1', reminder30mSentAt: null },
      });
    });

    it('force: true ignores the already-sent filter entirely', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(WEBINAR);
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([]);

      await service.sendReminders('webinar-1', '24h', { force: true });

      expect(prisma.webinarRegistration.findMany).toHaveBeenCalledWith({ where: { webinarId: 'webinar-1' } });
    });

    it('emails every matching registrant and marks the correct field per kind, returning the count sent', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(WEBINAR);
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([
        { id: 'reg-1', email: 'a@example.com' },
        { id: 'reg-2', email: 'b@example.com' },
      ]);

      const sent = await service.sendReminders('webinar-1', '30m');

      expect(sent).toBe(2);
      expect(email.send).toHaveBeenCalledTimes(2);
      expect(prisma.webinarRegistration.update).toHaveBeenCalledWith({
        where: { id: 'reg-1' },
        data: { reminder30mSentAt: expect.any(Date) },
      });
      expect(prisma.webinarRegistration.update).toHaveBeenCalledWith({
        where: { id: 'reg-2' },
        data: { reminder30mSentAt: expect.any(Date) },
      });
    });

    it('a failed send for one registrant does not stop the rest, and that registrant is not marked sent', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(WEBINAR);
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([
        { id: 'reg-1', email: 'a@example.com' },
        { id: 'reg-2', email: 'b@example.com' },
      ]);
      email.send.mockRejectedValueOnce(new Error('bounced')).mockResolvedValueOnce(undefined);

      const sent = await service.sendReminders('webinar-1', '24h');

      expect(sent).toBe(1);
      expect(prisma.webinarRegistration.update).toHaveBeenCalledTimes(1);
      expect(prisma.webinarRegistration.update).toHaveBeenCalledWith({
        where: { id: 'reg-2' },
        data: { reminder24hSentAt: expect.any(Date) },
      });
    });
  });
});
