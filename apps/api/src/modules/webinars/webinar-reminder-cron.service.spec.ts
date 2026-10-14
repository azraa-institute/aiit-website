import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebinarNotificationsService } from './webinar-notifications.service';
import { WebinarReminderCronService } from './webinar-reminder-cron.service';

const HOUR = 3_600_000;

function webinarStartingIn(hours: number) {
  return { id: `w-${hours}`, title: `Webinar in ${hours}h`, startsAt: new Date(Date.now() + hours * HOUR) };
}

describe('WebinarReminderCronService', () => {
  let service: WebinarReminderCronService;
  let prisma: { webinar: { findMany: jest.Mock } };
  let notifications: { sendReminders: jest.Mock };

  beforeEach(async () => {
    prisma = { webinar: { findMany: jest.fn() } };
    notifications = { sendReminders: jest.fn().mockResolvedValue(0) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebinarReminderCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebinarNotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(WebinarReminderCronService);
  });

  it('only queries webinars with a join link set and a future start time', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([]);
    await service.sweep();
    expect(prisma.webinar.findMany).toHaveBeenCalledWith({
      where: { joinUrl: { not: null }, startsAt: { not: null, gt: expect.any(Date) } },
    });
  });

  it('sends the 24h reminder between T-24h and T-1h', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([webinarStartingIn(23)]);
    await service.sweep();
    expect(notifications.sendReminders).toHaveBeenCalledWith('w-23', '24h');
    expect(notifications.sendReminders).not.toHaveBeenCalledWith('w-23', '30m');
  });

  it('does NOT send the 24h reminder once inside the last hour -- avoids a confusing "tomorrow" email right before start', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([webinarStartingIn(0.75)]);
    await service.sweep();
    expect(notifications.sendReminders).not.toHaveBeenCalledWith('w-0.75', '24h');
  });

  it('sends the 30m reminder between T-30m and T-0', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([webinarStartingIn(0.25)]);
    await service.sweep();
    expect(notifications.sendReminders).toHaveBeenCalledWith('w-0.25', '30m');
  });

  it('sends neither reminder more than 24h out', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([webinarStartingIn(48)]);
    await service.sweep();
    expect(notifications.sendReminders).not.toHaveBeenCalled();
  });

  it('one webinar throwing does not stop the sweep from processing the rest', async () => {
    prisma.webinar.findMany.mockResolvedValueOnce([webinarStartingIn(23), webinarStartingIn(0.25)]);
    notifications.sendReminders.mockRejectedValueOnce(new Error('send failed')).mockResolvedValueOnce(1);

    await expect(service.sweep()).resolves.toBeUndefined();
    expect(notifications.sendReminders).toHaveBeenCalledTimes(2);
  });
});
