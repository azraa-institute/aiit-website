import { BadRequestException, NotFoundException } from '@nestjs/common';
import { csvCell, toCsv } from '../../common/csv';
import { AdminAnnouncementsService } from './admin-announcements.service';
import { AdminComplaintsService } from './admin-complaints.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const COMPLAINT = '33333333-3333-4333-8333-333333333333';
const COURSE = '44444444-4444-4444-8444-444444444444';

describe('AdminComplaintsService', () => {
  let service: AdminComplaintsService;
  let prisma: {
    complaint: { findUnique: jest.Mock; update: jest.Mock };
    complaintMessage: { create: jest.Mock };
    notification: { create: jest.Mock };
    profile: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let audit: { record: jest.Mock };

  const detailRow = (status = 'open') => ({
    id: COMPLAINT,
    userId: STUDENT,
    category: 'learning_issue',
    courseId: null,
    instructorId: null,
    subject: 'Cannot hear',
    body: 'Audio problems',
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    course: null,
    messages: [],
  });

  beforeEach(() => {
    prisma = {
      complaint: { findUnique: jest.fn(), update: jest.fn() },
      complaintMessage: { create: jest.fn() },
      notification: { create: jest.fn() },
      profile: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([{ email: 'ada@example.com' }]),
    };
    audit = { record: jest.fn() };
    service = new AdminComplaintsService(prisma as never, audit as never);
  });

  it('a public reply notifies the student and moves a new report to in review', async () => {
    prisma.complaint.findUnique.mockImplementation(({ include }: { include?: unknown }) =>
      Promise.resolve(include ? detailRow() : { userId: STUDENT, subject: 'Cannot hear', status: 'open' }),
    );
    await service.reply(ADMIN, COMPLAINT, ' We are on it ', false);

    expect(prisma.complaintMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authorRole: 'admin', internal: false, body: 'We are on it' }),
    });
    expect(prisma.complaint.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'in_review' } }));
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: STUDENT, href: '/portal/support' }),
    });
  });

  it('an internal note is stored but never notifies the student', async () => {
    prisma.complaint.findUnique.mockImplementation(({ include }: { include?: unknown }) =>
      Promise.resolve(include ? detailRow() : { userId: STUDENT, subject: 'Cannot hear', status: 'open' }),
    );
    await service.reply(ADMIN, COMPLAINT, 'Student has complained twice before', true);

    expect(prisma.complaintMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ internal: true }) });
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.complaint.update).not.toHaveBeenCalled();
  });

  it('closing a report stamps who resolved it and tells the student', async () => {
    prisma.complaint.findUnique.mockImplementation(({ include }: { include?: unknown }) =>
      Promise.resolve(include ? detailRow('resolved') : { userId: STUDENT, subject: 'Cannot hear', status: 'in_review' }),
    );
    await service.setStatus(ADMIN, COMPLAINT, 'resolved');

    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'resolved', resolvedBy: ADMIN }) }),
    );
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'complaint.status', 'complaint', COMPLAINT, { from: 'in_review', to: 'resolved' });
  });

  it('404s for an unknown complaint', async () => {
    prisma.complaint.findUnique.mockResolvedValue(null);
    await expect(service.reply(ADMIN, COMPLAINT, 'hi', false)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.setStatus(ADMIN, COMPLAINT, 'resolved')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminAnnouncementsService', () => {
  let service: AdminAnnouncementsService;
  let prisma: {
    course: { findFirst: jest.Mock };
    enrollment: { findMany: jest.Mock };
    profile: { findMany: jest.Mock };
    notification: { createMany: jest.Mock };
    announcement: { create: jest.Mock };
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn().mockResolvedValue({ title: 'Cloud Computing Fundamentals' }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ userId: STUDENT }]) },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: STUDENT }]) },
      notification: { createMany: jest.fn() },
      announcement: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'a1', title: data.title, body: data.body, recipientCount: data.recipientCount, createdAt: new Date() }),
        ),
      },
    };
    audit = { record: jest.fn() };
    service = new AdminAnnouncementsService(prisma as never, audit as never);
  });

  it('a course announcement notifies only that course active students', async () => {
    const res = await service.create(ADMIN, { audience: 'course', courseId: COURSE, title: 'Class moved', body: 'Friday 7pm' });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: STUDENT, kind: 'course', title: 'Cloud Computing Fundamentals: Class moved' })],
    });
    expect(res.recipientCount).toBe(1);
  });

  it('an announcement to instructors is stored for their dashboard and creates no student notifications', async () => {
    prisma.profile.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]);
    const res = await service.create(ADMIN, { audience: 'instructors', title: 'Grading deadline', body: 'Friday' });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(res.recipientCount).toBe(2);
  });

  it('needs a course for a course announcement', async () => {
    await expect(service.create(ADMIN, { audience: 'course', title: 'Hi', body: 'There' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('csv', () => {
  it('neutralises spreadsheet formulas in user-supplied cells', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell('+1234')).toBe("'+1234");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-5')).toBe("'-5");
  });

  it('quotes commas, quotes and newlines, and writes empty cells for null', () => {
    expect(csvCell('Okoro, Grace')).toBe('"Okoro, Grace"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(new Date('2026-10-01T10:00:00Z'))).toBe('2026-10-01T10:00:00.000Z');
  });

  it('starts with a BOM and ends each row with CRLF', () => {
    const out = toCsv(['A', 'B'], [[1, 'x']]);
    expect(out.startsWith('﻿A,B\r\n1,x')).toBe(true);
    expect(out.endsWith('\r\n')).toBe(true);
  });
});
