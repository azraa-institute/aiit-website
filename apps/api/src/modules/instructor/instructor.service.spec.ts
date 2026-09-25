import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InstructorService } from './instructor.service';

const ME = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const COURSE = '33333333-3333-4333-8333-333333333333';
const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const SUBMISSION = '55555555-5555-4555-8555-555555555555';

describe('InstructorService', () => {
  let service: InstructorService;
  let prisma: {
    courseInstructor: { findUnique: jest.Mock; findMany: jest.Mock };
    assignment: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; findMany: jest.Mock };
    assignmentSubmission: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    enrollment: { findMany: jest.Mock; count: jest.Mock };
    profile: { findMany: jest.Mock };
    course: { findUnique: jest.Mock };
    notification: { create: jest.Mock; createMany: jest.Mock };
    announcement: { create: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let supabase: { signStorageUrl: jest.Mock };

  const teaches = () => prisma.courseInstructor.findUnique.mockResolvedValue({ courseId: COURSE });
  const doesNotTeach = () => prisma.courseInstructor.findUnique.mockResolvedValue(null);

  beforeEach(() => {
    prisma = {
      courseInstructor: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([{ courseId: COURSE }]) },
      assignment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      assignmentSubmission: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ userId: STUDENT }]), count: jest.fn().mockResolvedValue(1) },
      profile: { findMany: jest.fn().mockResolvedValue([{ id: STUDENT, name: 'Ada' }]) },
      course: { findUnique: jest.fn().mockResolvedValue({ title: 'Cloud Computing Fundamentals' }) },
      notification: { create: jest.fn(), createMany: jest.fn() },
      announcement: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    supabase = { signStorageUrl: jest.fn().mockResolvedValue('https://signed.example/file') };
    service = new InstructorService(prisma as never, supabase as never);
  });

  describe('course scoping', () => {
    it('refuses every course-level read and write for a course the instructor does not teach', async () => {
      doesNotTeach();
      await expect(service.roster(ME, COURSE)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.assignments(ME, COURSE)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.createAssignment(ME, COURSE, { title: 'Lab 1', description: 'Do it' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.announcements(ME, COURSE)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.createAnnouncement(ME, COURSE, { title: 'Hi', body: 'Hello' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.assignment.create).not.toHaveBeenCalled();
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('refuses to touch an assignment belonging to a course they do not teach', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: ASSIGNMENT, courseId: COURSE, course: { title: 'X' } });
      doesNotTeach();
      await expect(service.updateAssignment(ME, ASSIGNMENT, { title: 'New' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.deleteAssignment(ME, ASSIGNMENT)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.submissions(ME, ASSIGNMENT)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('only counts the instructor own courses on the dashboard', async () => {
      prisma.courseInstructor.findMany.mockResolvedValue([]);
      expect(await service.dashboard(ME)).toEqual({ courses: 0, students: 0, needsGrading: 0, classesThisWeek: 0, gradingQueue: [] });
    });
  });

  describe('assignments', () => {
    it('creates an assignment and tells the active enrolled students', async () => {
      teaches();
      prisma.assignment.create.mockResolvedValue({ id: ASSIGNMENT, title: 'Lab 1', course: { title: 'Cloud' } });
      prisma.profile.findMany.mockResolvedValue([{ id: STUDENT }]);

      await service.createAssignment(ME, COURSE, { title: ' Lab 1 ', description: ' Do it ', dueAt: '2030-01-10T12:00:00Z' });

      expect(prisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Lab 1', createdBy: ME, courseId: COURSE }) }),
      );
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ userId: STUDENT, kind: 'assignment', href: '/portal/assignments' })],
      });
    });

    it('rejects an invalid due date', async () => {
      teaches();
      await expect(
        service.createAssignment(ME, COURSE, { title: 'Lab', description: 'x', dueAt: 'not-a-date' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('will not delete an assignment students have already handed work in for', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: ASSIGNMENT, courseId: COURSE, course: { title: 'X' } });
      teaches();
      prisma.assignmentSubmission.count.mockResolvedValue(2);
      await expect(service.deleteAssignment(ME, ASSIGNMENT)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.assignment.delete).not.toHaveBeenCalled();
    });
  });

  describe('grading', () => {
    const submission = (overrides = {}) => ({
      id: SUBMISSION,
      userId: STUDENT,
      submittedAt: new Date(),
      assignment: { courseId: COURSE, title: 'Lab 1' },
      ...overrides,
    });

    it('grades a submission for a course they teach and notifies the student', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue(submission());
      teaches();
      prisma.assignmentSubmission.update.mockResolvedValue({ grade: 'A', feedback: 'Great', gradedAt: new Date('2026-10-01T10:00:00Z') });

      const res = await service.grade(ME, SUBMISSION, { grade: ' A ', feedback: ' Great ' });

      expect(res.grade).toBe('A');
      expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ grade: 'A', feedback: 'Great' }) }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: STUDENT, kind: 'assignment' }),
      });
    });

    it('refuses to grade another instructor course, an unknown submission, or an empty one', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue(submission());
      doesNotTeach();
      await expect(service.grade(ME, SUBMISSION, { grade: 'A' })).rejects.toBeInstanceOf(ForbiddenException);

      prisma.assignmentSubmission.findUnique.mockResolvedValue(null);
      await expect(service.grade(ME, SUBMISSION, { grade: 'A' })).rejects.toBeInstanceOf(NotFoundException);

      prisma.assignmentSubmission.findUnique.mockResolvedValue(submission({ submittedAt: null }));
      teaches();
      await expect(service.grade(ME, SUBMISSION, { grade: 'A' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assignmentSubmission.update).not.toHaveBeenCalled();
    });
  });

  describe('submission file links', () => {
    const withKey = (fileKey: string | null) => ({
      userId: STUDENT,
      assignmentId: ASSIGNMENT,
      fileKey,
      assignment: { courseId: COURSE },
    });

    it('signs a link only for a file inside that student own folder for this assignment', async () => {
      teaches();
      prisma.assignmentSubmission.findUnique.mockResolvedValue(withKey(`${STUDENT}/${ASSIGNMENT}/report.pdf`));
      const res = await service.fileLink(ME, SUBMISSION);
      expect(res).toEqual({ url: 'https://signed.example/file', fileName: 'report.pdf' });
      expect(supabase.signStorageUrl).toHaveBeenCalledWith('submissions', `${STUDENT}/${ASSIGNMENT}/report.pdf`, 300);
    });

    it('will not sign a key pointing at someone else file', async () => {
      teaches();
      prisma.assignmentSubmission.findUnique.mockResolvedValue(withKey('99999999-9999-4999-8999-999999999999/secret/passwords.pdf'));
      await expect(service.fileLink(ME, SUBMISSION)).rejects.toBeInstanceOf(ForbiddenException);
      expect(supabase.signStorageUrl).not.toHaveBeenCalled();
    });

    it('will not sign for a course the instructor does not teach, or when there is no file', async () => {
      doesNotTeach();
      prisma.assignmentSubmission.findUnique.mockResolvedValue(withKey(`${STUDENT}/${ASSIGNMENT}/a.pdf`));
      await expect(service.fileLink(ME, SUBMISSION)).rejects.toBeInstanceOf(ForbiddenException);

      teaches();
      prisma.assignmentSubmission.findUnique.mockResolvedValue(withKey(null));
      await expect(service.fileLink(ME, SUBMISSION)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('announcements', () => {
    it('stores the announcement and notifies only active enrolled students, recording how many', async () => {
      teaches();
      prisma.profile.findMany.mockResolvedValue([{ id: STUDENT }]);
      prisma.announcement.create.mockResolvedValue({
        id: 'a1',
        courseId: COURSE,
        title: 'Class moved',
        body: 'Friday is now 7pm',
        recipientCount: 1,
        createdAt: new Date('2026-10-01T10:00:00Z'),
      });

      const res = await service.createAnnouncement(ME, COURSE, { title: 'Class moved', body: 'Friday is now 7pm' });

      expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ courseId: COURSE, authorId: ME, recipientCount: 1 }),
      });
      expect(res.recipientCount).toBe(1);
    });
  });
});
