import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InstructorController } from '../instructor/instructor.controller';
import { InstructorService } from '../instructor/instructor.service';
import { SupportService } from './support.service';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const COURSE = '33333333-3333-4333-8333-333333333333';
const TEACHER = '44444444-4444-4444-8444-444444444444';
const COMPLAINT = '55555555-5555-4555-8555-555555555555';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: COMPLAINT,
    userId: ME,
    category: 'learning_issue',
    courseId: null,
    instructorId: null,
    subject: 'Cannot hear the class',
    body: 'The audio cuts out every few minutes.',
    status: 'open',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    ...overrides,
  };
}

describe('SupportService', () => {
  let service: SupportService;
  let prisma: {
    enrollment: { findMany: jest.Mock; findFirst: jest.Mock };
    courseInstructor: { findUnique: jest.Mock };
    complaint: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    complaintMessage: { findMany: jest.Mock; create: jest.Mock; groupBy: jest.Mock };
    profile: { findMany: jest.Mock };
    course: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      enrollment: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
      courseInstructor: { findUnique: jest.fn().mockResolvedValue({ courseId: COURSE }) },
      complaint: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      complaintMessage: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: TEACHER, name: 'Grace Okoro' }]) },
      course: { findMany: jest.fn().mockResolvedValue([{ id: COURSE, title: 'Cloud Computing Fundamentals' }]) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new SupportService(prisma as never);
  });

  describe('create', () => {
    it('files a general report', async () => {
      prisma.complaint.create.mockResolvedValue(row());
      const res = await service.create(ME, { category: 'learning_issue', subject: ' Cannot hear the class ', body: ' The audio cuts out every few minutes. ' });
      expect(prisma.complaint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: ME, subject: 'Cannot hear the class', courseId: null, instructorId: null }),
      });
      expect(res).toMatchObject({ id: COMPLAINT, status: 'open', replies: 0 });
    });

    it('files a report about an instructor the student is taught by', async () => {
      prisma.complaint.create.mockResolvedValue(row({ category: 'instructor', courseId: COURSE, instructorId: TEACHER }));
      const res = await service.create(ME, {
        category: 'instructor',
        subject: 'Late to class',
        body: 'They keep starting twenty minutes late.',
        courseId: COURSE,
        instructorId: TEACHER,
      });
      expect(res.instructorName).toBe('Grace Okoro');
      expect(res.courseTitle).toBe('Cloud Computing Fundamentals');
    });

    it('rejects an instructor report with no instructor, or an instructor with no course', async () => {
      await expect(
        service.create(ME, { category: 'instructor', subject: 'Something', body: 'Details go here please.' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(ME, { category: 'other', subject: 'Something', body: 'Details go here please.', instructorId: TEACHER }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.complaint.create).not.toHaveBeenCalled();
    });

    it('only accepts a course the student is enrolled in and an instructor who teaches it', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.create(ME, { category: 'course_content', subject: 'Outdated', body: 'The slides are outdated.', courseId: COURSE }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      prisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      prisma.courseInstructor.findUnique.mockResolvedValue(null);
      await expect(
        service.create(ME, {
          category: 'instructor',
          subject: 'Something',
          body: 'Details go here please.',
          courseId: COURSE,
          instructorId: TEACHER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('privacy', () => {
    it('shows a student only their own report, and someone else report looks like it does not exist', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ userId: OTHER }));
      await expect(service.detail(ME, COMPLAINT)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.reply(ME, COMPLAINT, 'hello')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('never returns internal admin notes to the student', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row());
      await service.detail(ME, COMPLAINT);
      expect(prisma.complaintMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { complaintId: COMPLAINT, internal: false } }),
      );
    });

    it('labels replies as the student or the AIIT team, never by an admin name', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row());
      prisma.complaintMessage.findMany.mockResolvedValue([
        { id: 'm1', authorRole: 'admin', body: 'We are looking into it.', createdAt: new Date('2026-10-01T11:00:00Z') },
        { id: 'm2', authorRole: 'student', body: 'Thank you.', createdAt: new Date('2026-10-01T12:00:00Z') },
      ]);
      const res = await service.detail(ME, COMPLAINT);
      expect(res.messages.map((m) => m.from)).toEqual(['admin', 'student']);
      expect(JSON.stringify(res.messages)).not.toContain('authorId');
    });
  });

  describe('reply', () => {
    it('reopens a resolved report when the student writes back', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ status: 'resolved' }));
      await service.reply(ME, COMPLAINT, 'It is still happening');
      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'open', resolvedAt: null, resolvedBy: null } }),
      );
    });

    it('will not accept a reply on a dismissed report', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ status: 'dismissed' }));
      await expect(service.reply(ME, COMPLAINT, 'Please reconsider')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('instructor isolation', () => {
    it('gives the instructor API no way to read complaints', () => {
      const surface = [...Object.getOwnPropertyNames(InstructorController.prototype), ...Object.getOwnPropertyNames(InstructorService.prototype)];
      expect(surface.filter((name) => /complain|report/i.test(name))).toEqual([]);
    });
  });
});
