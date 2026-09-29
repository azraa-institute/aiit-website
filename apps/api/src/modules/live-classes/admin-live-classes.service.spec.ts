import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminLiveClassesService } from './admin-live-classes.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const INSTRUCTOR_A = '33333333-3333-4333-8333-333333333333';
const INSTRUCTOR_B = '44444444-4444-4444-8444-444444444444';
const TIMETABLE = '55555555-5555-4555-8555-555555555555';
const CLASS = '66666666-6666-4666-8666-666666666666';
// 2030-01-07 is a Monday, safely in the future.
const START = '2030-01-07';

describe('AdminLiveClassesService.autoGenerate', () => {
  let service: AdminLiveClassesService;
  let prisma: {
    course: { findFirst: jest.Mock };
    courseInstructor: { findMany: jest.Mock };
    profile: { findMany: jest.Mock; findUnique: jest.Mock };
    liveClass: { count: jest.Mock; findMany: jest.Mock; createMany: jest.Mock; groupBy: jest.Mock };
    timetable: { create: jest.Mock; findUnique: jest.Mock };
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn().mockResolvedValue({ id: COURSE, title: 'Cloud Computing Fundamentals' }) },
      courseInstructor: { findMany: jest.fn().mockResolvedValue([]) },
      // createTimetable re-validates the host it is handed, so any id resolves to an instructor.
      profile: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ role: 'instructor' }) },
      liveClass: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      timetable: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tt-1',
            courseId: data.courseId,
            course: { title: 'Cloud Computing Fundamentals' },
            title: data.title,
            timeZone: data.timeZone,
            startsOn: data.startsOn,
            endsOn: data.endsOn,
            hostUserId: data.hostUserId,
            slots: data.slots.create.map((s: object, i: number) => ({ id: `s${i}`, ...s })),
            _count: { classes: 0 },
          }),
        ),
        findUnique: jest.fn(),
      },
    };
    audit = { record: jest.fn() };
    service = new AdminLiveClassesService(prisma as never, audit as never);
    // generateClasses re-reads the timetable it was just handed.
    prisma.timetable.findUnique.mockImplementation(async () => {
      const created = await prisma.timetable.create.mock.results[0].value;
      return { ...created, slots: created.slots };
    });
  });

  it('generates a month of Mon/Wed/Fri 18:00-20:00 classes with just a course, zone and start date', async () => {
    prisma.courseInstructor.findMany.mockResolvedValue([{ instructorId: INSTRUCTOR_A }]);
    prisma.profile.findMany.mockResolvedValue([{ id: INSTRUCTOR_A, name: 'Grace Okoro' }]);

    const res = await service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'Africa/Lagos', startDate: START });

    expect(res.status).toBe('created');
    if (res.status !== 'created') return;
    expect(res.created).toBe(12);
    expect(res.unassigned).toBe(false);
    expect(res.instructorName).toBe('Grace Okoro');
    const rows = prisma.liveClass.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(12);
    expect(rows[0].startsAt.toISOString()).toBe('2030-01-07T17:00:00.000Z');
    expect(rows[0].endsAt.toISOString()).toBe('2030-01-07T19:00:00.000Z');
    expect(rows.every((r: { hostUserId: string }) => r.hostUserId === INSTRUCTOR_A)).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'timetable.generate', 'timetable', 'tt-1', expect.any(Object));
  });

  it('still generates when the course has no instructor yet, and says so', async () => {
    const res = await service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'UTC', startDate: START });
    expect(res.status).toBe('created');
    if (res.status === 'created') expect(res.unassigned).toBe(true);
    expect(prisma.liveClass.createMany.mock.calls[0][0].data[0].hostUserId).toBeNull();
  });

  it('reports sessions that would double-book the instructor instead of creating anything', async () => {
    prisma.courseInstructor.findMany.mockResolvedValue([{ instructorId: INSTRUCTOR_A }]);
    prisma.profile.findMany.mockResolvedValue([{ id: INSTRUCTOR_A, name: 'Grace Okoro' }]);
    prisma.liveClass.findMany.mockResolvedValue([
      {
        title: 'Ethical Hacking - live class',
        startsAt: new Date('2030-01-07T17:30:00Z'),
        endsAt: new Date('2030-01-07T19:30:00Z'),
      },
    ]);

    const res = await service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'Africa/Lagos', startDate: START });

    expect(res.status).toBe('conflicts');
    if (res.status === 'conflicts') {
      expect(res.conflicts).toHaveLength(1);
      expect(res.conflicts[0].otherClass).toBe('Ethical Hacking - live class');
    }
    expect(prisma.timetable.create).not.toHaveBeenCalled();
  });

  it('creates it anyway when the admin allows the conflicts', async () => {
    prisma.courseInstructor.findMany.mockResolvedValue([{ instructorId: INSTRUCTOR_A }]);
    prisma.profile.findMany.mockResolvedValue([{ id: INSTRUCTOR_A, name: 'Grace Okoro' }]);
    prisma.liveClass.findMany.mockResolvedValue([
      { title: 'Other', startsAt: new Date('2030-01-07T17:30:00Z'), endsAt: new Date('2030-01-07T19:30:00Z') },
    ]);
    const res = await service.autoGenerate(ADMIN, {
      courseId: COURSE,
      timeZone: 'Africa/Lagos',
      startDate: START,
      allowConflicts: true,
    });
    expect(res.status).toBe('created');
  });

  it('refuses to stack a second timetable on a period the course already has classes in', async () => {
    prisma.liveClass.count.mockResolvedValue(3);
    await expect(
      service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'UTC', startDate: START }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.timetable.create).not.toHaveBeenCalled();
  });

  it('gives the class to the assigned instructor with the lighter upcoming load', async () => {
    prisma.courseInstructor.findMany.mockResolvedValue([{ instructorId: INSTRUCTOR_A }, { instructorId: INSTRUCTOR_B }]);
    prisma.profile.findMany.mockResolvedValue([
      { id: INSTRUCTOR_A, name: 'Busy' },
      { id: INSTRUCTOR_B, name: 'Free' },
    ]);
    prisma.liveClass.groupBy.mockResolvedValue([{ hostUserId: INSTRUCTOR_A, _count: { _all: 9 } }]);

    const res = await service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'UTC', startDate: START });
    expect(res.status === 'created' && res.instructorName).toBe('Free');
  });

  it('rejects an invalid time zone, past-only dates, and an unknown course', async () => {
    await expect(
      service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'Mars/Olympus', startDate: START }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'UTC', startDate: '2020-01-06' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.autoGenerate(ADMIN, { courseId: COURSE, timeZone: 'UTC', startDate: START }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminLiveClassesService audit coverage (manual create/edit/delete)', () => {
  let service: AdminLiveClassesService;
  let prisma: {
    course: { findFirst: jest.Mock };
    profile: { findUnique: jest.Mock };
    timetable: { findUnique: jest.Mock; delete: jest.Mock };
    timetableSlot: { deleteMany: jest.Mock; createMany: jest.Mock };
    liveClass: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn().mockResolvedValue({ id: COURSE }) },
      profile: { findUnique: jest.fn().mockResolvedValue({ role: 'instructor' }) },
      timetable: { findUnique: jest.fn(), delete: jest.fn() },
      timetableSlot: { deleteMany: jest.fn(), createMany: jest.fn() },
      liveClass: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn() };
    service = new AdminLiveClassesService(prisma as never, audit as never);
  });

  it('logs timetable.update after a successful edit', async () => {
    prisma.timetable.findUnique.mockResolvedValue({
      id: TIMETABLE,
      timeZone: 'UTC',
      startsOn: new Date('2030-01-07'),
      endsOn: new Date('2030-02-04'),
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        timetableSlot: prisma.timetableSlot,
        liveClass: prisma.liveClass,
        timetable: {
          update: jest.fn().mockResolvedValue({
            id: TIMETABLE,
            course: { title: 'Cloud Computing Fundamentals' },
            title: 'New title',
            timeZone: 'UTC',
            startsOn: new Date('2030-01-07'),
            endsOn: new Date('2030-02-04'),
            hostUserId: null,
            slots: [],
            _count: { classes: 0 },
          }),
        },
      }),
    );

    await service.updateTimetable(ADMIN, TIMETABLE, { title: 'New title' });

    expect(audit.record).toHaveBeenCalledWith(
      ADMIN,
      'timetable.update',
      'timetable',
      TIMETABLE,
      expect.objectContaining({ course: 'Cloud Computing Fundamentals' }),
    );
  });

  it('logs timetable.delete with the course title, after deleting', async () => {
    prisma.timetable.findUnique.mockResolvedValue({ id: TIMETABLE, course: { title: 'Cloud Computing Fundamentals' } });
    prisma.$transaction.mockResolvedValue([]);

    await service.deleteTimetable(ADMIN, TIMETABLE);

    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'timetable.delete', 'timetable', TIMETABLE, {
      course: 'Cloud Computing Fundamentals',
    });
  });

  it('404s deleteTimetable for an unknown id without touching the audit log', async () => {
    prisma.timetable.findUnique.mockResolvedValue(null);
    await expect(service.deleteTimetable(ADMIN, TIMETABLE)).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('logs live_class.create for a one-off class, keyed by the id it was created with', async () => {
    prisma.liveClass.create.mockImplementation(({ data }: { data: { id: string; startsAt: Date; endsAt: Date } }) =>
      Promise.resolve({
        id: data.id,
        courseId: COURSE,
        timetableId: null,
        title: 'Extra session',
        description: null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: 'scheduled',
        hostUserId: null,
        joinOpensMinutes: 15,
        course: { slug: 'course', title: 'Cloud Computing Fundamentals' },
        _count: { attendance: 0 },
      }),
    );

    await service.createClass(ADMIN, {
      courseId: COURSE,
      title: 'Extra session',
      startsAt: '2030-01-10T18:00:00Z',
      endsAt: '2030-01-10T19:00:00Z',
    });

    const createdId = prisma.liveClass.create.mock.calls[0][0].data.id as string;
    expect(audit.record).toHaveBeenCalledWith(
      ADMIN,
      'live_class.create',
      'live_class',
      createdId,
      expect.objectContaining({ course: 'Cloud Computing Fundamentals' }),
    );
  });

  it('logs live_class.cancel (not .update) when a class is cancelled', async () => {
    const startsAt = new Date('2030-01-10T18:00:00Z');
    const endsAt = new Date('2030-01-10T19:00:00Z');
    prisma.liveClass.findUnique.mockResolvedValue({ id: CLASS, status: 'scheduled', startsAt, endsAt });
    prisma.liveClass.update.mockResolvedValue({
      id: CLASS,
      courseId: COURSE,
      timetableId: null,
      title: 'Extra session',
      description: null,
      startsAt,
      endsAt,
      status: 'cancelled',
      hostUserId: null,
      joinOpensMinutes: 15,
      course: { slug: 'course', title: 'Cloud Computing Fundamentals' },
      _count: { attendance: 0 },
    });

    await service.updateClass(ADMIN, CLASS, { status: 'cancelled' });

    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'live_class.cancel', 'live_class', CLASS, expect.any(Object));
  });

  it('refuses to edit a class that has already started', async () => {
    prisma.liveClass.findUnique.mockResolvedValue({ id: CLASS, status: 'live', startsAt: new Date(), endsAt: new Date() });
    await expect(service.updateClass(ADMIN, CLASS, { title: 'New title' })).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
