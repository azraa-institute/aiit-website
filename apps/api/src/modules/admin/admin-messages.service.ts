import { Injectable } from '@nestjs/common';
import type { Paginated } from '@aiit/shared';
import type { AdminContactMessage } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const PAGE_SIZE = 25;

interface ListQuery {
  q?: string;
  page?: number;
}

/**
 * Read side of the public contact form -- ContactService.create() has been
 * writing these rows since Phase 0, but nothing ever read them back. This is
 * that missing read path, so a message (e.g. from a suspended student using
 * the new "Contact us" link) is actually visible to an admin.
 */
@Injectable()
export class AdminMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery): Promise<Paginated<AdminContactMessage>> {
    const page = query.page ?? 1;
    const where = query.q?.trim()
      ? {
          OR: [
            { name: { contains: query.q.trim(), mode: 'insensitive' as const } },
            { email: { contains: query.q.trim(), mode: 'insensitive' as const } },
            { topic: { contains: query.q.trim(), mode: 'insensitive' as const } },
            { message: { contains: query.q.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        topic: r.topic,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }
}
