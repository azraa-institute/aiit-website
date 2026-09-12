import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const NOTIFICATION_ROW = {
  id: 'note-1',
  kind: 'course',
  title: "You're enrolled in Digital & Tech Literacy",
  body: null,
  href: '/courses/digital-and-tech-literacy-absolute-beginner',
  read: false,
  createdAt: new Date('2026-09-12T00:00:00.000Z'),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('listForUser', () => {
    it('maps notification rows', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([NOTIFICATION_ROW]);
      const result = await service.listForUser('user-1');
      expect(result).toEqual([
        {
          id: 'note-1',
          kind: 'course',
          title: "You're enrolled in Digital & Tech Literacy",
          body: null,
          href: '/courses/digital-and-tech-literacy-absolute-beginner',
          read: false,
          createdAt: '2026-09-12T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('markRead', () => {
    it('throws NotFoundException when the notification does not belong to the user', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.markRead('user-1', 'note-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks the notification read and returns it', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.notification.findUniqueOrThrow.mockResolvedValueOnce({ ...NOTIFICATION_ROW, read: true });
      const result = await service.markRead('user-1', 'note-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'note-1', userId: 'user-1' },
        data: { read: true },
      });
      expect(result.read).toBe(true);
    });
  });

  describe('markAllRead', () => {
    it('updates only unread notifications for the user', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 3 });
      await service.markAllRead('user-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
    });
  });

  describe('create', () => {
    it('creates a notification row for the given user', async () => {
      prisma.notification.create.mockResolvedValueOnce(NOTIFICATION_ROW);
      await service.create('user-1', 'course', 'Title', 'Body', '/href');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', kind: 'course', title: 'Title', body: 'Body', href: '/href' },
      });
    });
  });
});
