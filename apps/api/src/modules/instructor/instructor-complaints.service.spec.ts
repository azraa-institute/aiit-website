import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InstructorComplaintsService } from './instructor-complaints.service';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const OTHER_TEACHER = '22222222-2222-4222-8222-222222222222';
const STUDENT = '33333333-3333-4333-8333-333333333333';
const COURSE = '44444444-4444-4444-8444-444444444444';
const REPORT = '55555555-5555-4555-8555-555555555555';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: REPORT,
    userId: TEACHER,
    filerRole: 'instructor',
    category: 'student',
    courseId: COURSE,
    instructorId: null,
    targetStudentId: STUDENT,
    subject: 'Repeated no-shows',
    body: 'Missed the last four sessions without notice.',
    status: 'open',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    ...overrides,
  };
}

describe('InstructorComplaintsService', () => {
  let service: InstructorComplaintsService;
  let prisma: {
    courseInstructor: { findMany: jest.Mock; findUnique: jest.Mock };
    enrollment: { findMany: jest.Mock; findFirst: jest.Mock };
    complaint: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    complaintMessage: { findMany: jest.Mock; create: jest.Mock; groupBy: jest.Mock };
    profile: { findMany: jest.Mock };
    course: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      courseInstructor: {
        findMany: jest.fn().mockResolvedValue([{ courseId: COURSE }]),
        findUnique: jest.fn().mockResolvedValue({ courseId: COURSE }),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
      complaint: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      complaintMessage: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: STUDENT, name: 'Femi Adewale' }]) },
      course: { findMany: jest.fn().mockResolvedValue([{ id: COURSE, title: 'Cloud Computing Fundamentals' }]) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new InstructorComplaintsService(prisma as never);
  });

  describe('create', () => {
    it('files a report tagged as filed by the instructor, about the named student', async () => {
      prisma.complaint.create.mockResolvedValue(row());
      const res = await service.create(TEACHER, { studentId: STUDENT, courseId: COURSE, subject: 'Repeated no-shows', body: 'Missed the last four sessions without notice.' });

      expect(prisma.complaint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: TEACHER, filerRole: 'instructor', category: 'student', targetStudentId: STUDENT, courseId: COURSE }),
      });
      expect(res.studentName).toBe('Femi Adewale');
      expect(res.courseTitle).toBe('Cloud Computing Fundamentals');
    });

    it('refuses a course the instructor does not teach', async () => {
      prisma.courseInstructor.findUnique.mockResolvedValue(null);
      await expect(
        service.create(TEACHER, { studentId: STUDENT, courseId: COURSE, subject: 'Something', body: 'Details go here please.' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a student not enrolled in the named course', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TEACHER, { studentId: STUDENT, courseId: COURSE, subject: 'Something', body: 'Details go here please.' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('without a course, still requires the student be enrolled in one the instructor teaches', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TEACHER, { studentId: STUDENT, subject: 'Something', body: 'Details go here please.' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.complaint.create).not.toHaveBeenCalled();
    });
  });

  describe('isolation', () => {
    it('cannot read another instructor\'s report, or a student-filed complaint -- both look like they do not exist', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ userId: OTHER_TEACHER }));
      await expect(service.detail(TEACHER, REPORT)).rejects.toBeInstanceOf(NotFoundException);

      prisma.complaint.findUnique.mockResolvedValue(row({ filerRole: 'student', userId: TEACHER }));
      await expect(service.detail(TEACHER, REPORT)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('labels the thread as the instructor or the AIIT team, never a student message', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row());
      prisma.complaintMessage.findMany.mockResolvedValue([
        { id: 'm1', authorRole: 'admin', body: 'Thanks for flagging this.', createdAt: new Date('2026-10-01T11:00:00Z') },
        { id: 'm2', authorRole: 'instructor', body: 'Let me know how it goes.', createdAt: new Date('2026-10-01T12:00:00Z') },
      ]);
      const res = await service.detail(TEACHER, REPORT);
      expect(res.messages.map((m) => m.from)).toEqual(['admin', 'instructor']);
    });
  });

  describe('reply', () => {
    it('reopens a resolved report when the instructor writes back', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ status: 'resolved' }));
      await service.reply(TEACHER, REPORT, 'Still happening this week');
      expect(prisma.complaint.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'open', resolvedAt: null, resolvedBy: null } }));
    });

    it('will not accept a reply on a dismissed report', async () => {
      prisma.complaint.findUnique.mockResolvedValue(row({ status: 'dismissed' }));
      await expect(service.reply(TEACHER, REPORT, 'Please reconsider')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
