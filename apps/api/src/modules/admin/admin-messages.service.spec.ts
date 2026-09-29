import { AdminMessagesService } from './admin-messages.service';

describe('AdminMessagesService', () => {
  let service: AdminMessagesService;
  let prisma: { contactMessage: { findMany: jest.Mock; count: jest.Mock } };

  beforeEach(() => {
    prisma = {
      contactMessage: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            name: 'Ada',
            email: 'ada@example.com',
            topic: 'Suspended account',
            message: 'Why was I suspended?',
            createdAt: new Date('2026-09-29T10:00:00Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    service = new AdminMessagesService(prisma as never);
  });

  it('lists messages newest first, mapped to ISO dates', async () => {
    const res = await service.list({});
    expect(res).toEqual({
      items: [
        { id: 'm1', name: 'Ada', email: 'ada@example.com', topic: 'Suspended account', message: 'Why was I suspended?', createdAt: '2026-09-29T10:00:00.000Z' },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    expect(prisma.contactMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, orderBy: { createdAt: 'desc' } }));
  });

  it('searches name, email, topic and message, case-insensitively', async () => {
    await service.list({ q: 'suspended' });
    expect(prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'suspended', mode: 'insensitive' } },
            { email: { contains: 'suspended', mode: 'insensitive' } },
            { topic: { contains: 'suspended', mode: 'insensitive' } },
            { message: { contains: 'suspended', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });
});
