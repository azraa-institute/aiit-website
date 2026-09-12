import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification as NotificationRow } from '@prisma/client';
import type { Notification, NotificationKind } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toNotification);
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const result = await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    if (result.count === 0) throw new NotFoundException('Notification not found.');
    const row = await this.prisma.notification.findUniqueOrThrow({ where: { id } });
    return toNotification(row);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  /** Called by other services (enrollment, grading, certificate issuance) via the service-role connection -- never exposed to clients directly. */
  async create(userId: string, kind: NotificationKind, title: string, body?: string, href?: string): Promise<void> {
    await this.prisma.notification.create({ data: { userId, kind, title, body, href } });
  }
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}
