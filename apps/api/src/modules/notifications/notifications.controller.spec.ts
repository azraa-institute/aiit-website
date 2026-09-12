import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notifications: { listForUser: jest.Mock; markRead: jest.Mock; markAllRead: jest.Mock };

  beforeEach(async () => {
    notifications = { listForUser: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(NotificationsController);
  });

  it('delegates GET / to listForUser', async () => {
    notifications.listForUser.mockResolvedValueOnce([]);
    await expect(controller.list({ userId: 'user-1', role: 'learner' })).resolves.toEqual([]);
    expect(notifications.listForUser).toHaveBeenCalledWith('user-1');
  });

  it('delegates PATCH /:id to markRead', async () => {
    notifications.markRead.mockResolvedValueOnce({});
    await controller.markRead('note-1', { userId: 'user-1', role: 'learner' });
    expect(notifications.markRead).toHaveBeenCalledWith('user-1', 'note-1');
  });

  it('delegates PATCH / to markAllRead', async () => {
    notifications.markAllRead.mockResolvedValueOnce(undefined);
    await controller.markAllRead({ userId: 'user-1', role: 'learner' });
    expect(notifications.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
