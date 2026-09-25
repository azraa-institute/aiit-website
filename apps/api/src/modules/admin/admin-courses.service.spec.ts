import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCoursesService } from './admin-courses.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const INSTRUCTOR = '33333333-3333-4333-8333-333333333333';

describe('AdminCoursesService', () => {
  let service: AdminCoursesService;
  let prisma: {
    course: { findFirst: jest.Mock; findMany: jest.Mock };
    profile: { count: jest.Mock; findMany: jest.Mock };
    courseInstructor: { deleteMany: jest.Mock; createMany: jest.Mock };
    liveClass: { updateMany: jest.Mock };
    timetable: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      course: {
        findFirst: jest.fn().mockResolvedValue({ id: COURSE, title: 'Cloud Computing Fundamentals' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: COURSE,
            slug: 'cloud',
            title: 'Cloud Computing Fundamentals',
            _count: { enrollments: 7 },
            instructors: [{ instructorId: INSTRUCTOR }],
          },
        ]),
      },
      profile: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: INSTRUCTOR, name: 'Grace' }]) },
      courseInstructor: { deleteMany: jest.fn(), createMany: jest.fn() },
      liveClass: { updateMany: jest.fn() },
      timetable: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    audit = { record: jest.fn() };
    service = new AdminCoursesService(prisma as never, audit as never);
  });

  it('lists courses with their enrolment count and instructor names', async () => {
    const [c] = await service.list();
    expect(c).toEqual({
      id: COURSE,
      slug: 'cloud',
      title: 'Cloud Computing Fundamentals',
      enrolled: 7,
      instructors: [{ id: INSTRUCTOR, name: 'Grace' }],
    });
  });

  it('replaces the instructor set, only accepting active instructors', async () => {
    prisma.profile.count.mockResolvedValue(1);
    const res = await service.setInstructors(ADMIN, COURSE, [INSTRUCTOR, INSTRUCTOR]);
    expect(prisma.courseInstructor.createMany).toHaveBeenCalledWith({
      data: [{ courseId: COURSE, instructorId: INSTRUCTOR, assignedBy: ADMIN }],
    });
    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'course.set_instructors', 'course', COURSE, expect.any(Object));
    expect(res.id).toBe(COURSE);
  });

  it('staffs upcoming classes that had no host once an instructor is assigned', async () => {
    prisma.profile.count.mockResolvedValue(1);
    await service.setInstructors(ADMIN, COURSE, [INSTRUCTOR]);
    expect(prisma.liveClass.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ courseId: COURSE, hostUserId: null }), data: { hostUserId: INSTRUCTOR } }),
    );
  });

  it('rejects someone who is not an active instructor', async () => {
    prisma.profile.count.mockResolvedValue(0);
    await expect(service.setInstructors(ADMIN, COURSE, [INSTRUCTOR])).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('404s for an unknown course, and allows clearing the set', async () => {
    prisma.course.findFirst.mockResolvedValueOnce(null);
    await expect(service.setInstructors(ADMIN, COURSE, [])).rejects.toBeInstanceOf(NotFoundException);
    await service.setInstructors(ADMIN, COURSE, []);
    expect(prisma.profile.count).not.toHaveBeenCalled();
  });
});
