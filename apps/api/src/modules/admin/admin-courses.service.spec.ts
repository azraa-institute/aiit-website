import { deflateSync } from 'zlib';
import { BadRequestException, ConflictException, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { AdminCoursesService } from './admin-courses.service';
import type { CourseInputDto } from './dto/admin-course.dto';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const INSTRUCTOR = '33333333-3333-4333-8333-333333333333';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const DOMAIN = '55555555-5555-4555-8555-555555555555';

/** A minimal, valid, single-color PNG of the given pixel dimensions -- just enough for image-size to read real width/height from, no fixture files or extra dependencies. */
function makePng(width: number, height: number): Buffer {
  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }
  function crc32(buf: Buffer): number {
    let c: number;
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    let crc = 0xffffffff;
    for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type: RGB
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  const idatData = deflateSync(raw);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

const COURSE_ROW = {
  id: COURSE,
  slug: 'crm-professional-certification',
  title: 'CRM Professional Certification',
  categoryId: CATEGORY,
  category: { name: 'IT & Business' },
  domainId: null,
  catalogueCategory: 'technology-management-business',
  technologies: [{ name: 'Zoho CRM', type: 'platform', icon: 'briefcase', tier: 'core' }],
  summary: 'A 4-week CRM certification track.',
  description: 'Participants configure a sandbox CRM organisation.',
  priceUsdCents: 15000,
  priceWasUsdCents: null,
  pricing: 'paid',
  level: 'beginner_intermediate',
  durationHours: 24,
  durationLabel: '4 Weeks',
  badges: ['new_badge'],
  instructorId: null,
  image: 'https://example.com/cover.jpg',
  outcomes: ['Set up a CRM organisation'],
  requirements: ['Basic computer literacy'],
  audience: ['Anyone wanting practical CRM skills'],
  toolsCovered: ['Zoho CRM'],
  certification: 'AIIT Certificate of Completion',
  status: 'draft',
  publishedAt: null,
  _count: { enrollments: 0 },
  createdAt: new Date('2026-11-23T00:00:00.000Z'),
};

const COURSE_INPUT: CourseInputDto = {
  slug: 'crm-professional-certification',
  title: 'CRM Professional Certification',
  categoryName: 'IT & Business',
  catalogueCategory: 'technology-management-business',
  technologies: [{ name: 'Zoho CRM', type: 'platform', icon: 'briefcase', tier: 'core' }],
  summary: 'A 4-week CRM certification track.',
  description: 'Participants configure a sandbox CRM organisation.',
  priceUsdCents: 15000,
  pricing: 'paid',
  level: 'Beginner–Intermediate',
  durationHours: 24,
  durationLabel: '4 Weeks',
  badges: ['new'],
  image: 'https://example.com/cover.jpg',
  outcomes: ['Set up a CRM organisation'],
  requirements: ['Basic computer literacy'],
  audience: ['Anyone wanting practical CRM skills'],
  toolsCovered: ['Zoho CRM'],
  certification: 'AIIT Certificate of Completion',
  status: 'draft',
};

describe('AdminCoursesService', () => {
  let service: AdminCoursesService;
  let prisma: {
    course: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    courseCategory: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    courseDomain: { findUnique: jest.Mock; findMany: jest.Mock };
    profile: { count: jest.Mock; findMany: jest.Mock };
    courseInstructor: { deleteMany: jest.Mock; createMany: jest.Mock };
    liveClass: { updateMany: jest.Mock };
    timetable: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let supabase: { uploadToStorage: jest.Mock };

  beforeEach(() => {
    prisma = {
      course: {
        findFirst: jest.fn().mockResolvedValue({ id: COURSE, title: 'Cloud Computing Fundamentals' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: COURSE,
            slug: 'cloud',
            title: 'Cloud Computing Fundamentals',
            status: 'published',
            _count: { enrollments: 7 },
            instructors: [{ instructorId: INSTRUCTOR }],
          },
        ]),
        create: jest.fn().mockResolvedValue(COURSE_ROW),
        update: jest.fn().mockResolvedValue(COURSE_ROW),
      },
      courseCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: CATEGORY, name: 'IT & Business' }),
        findMany: jest.fn().mockResolvedValue([{ id: CATEGORY, name: 'IT & Business', domainId: null }]),
        create: jest.fn().mockResolvedValue({ id: CATEGORY }),
      },
      courseDomain: {
        findUnique: jest.fn().mockResolvedValue({ id: DOMAIN }),
        findMany: jest.fn().mockResolvedValue([{ id: DOMAIN, slug: 'ai', name: 'Artificial Intelligence' }]),
      },
      profile: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: INSTRUCTOR, name: 'Grace' }]) },
      courseInstructor: { deleteMany: jest.fn(), createMany: jest.fn() },
      liveClass: { updateMany: jest.fn() },
      timetable: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    audit = { record: jest.fn() };
    supabase = { uploadToStorage: jest.fn().mockResolvedValue(undefined) };
    service = new AdminCoursesService(prisma as never, audit as never, supabase as never);
  });

  it('lists courses with their enrolment count and instructor names', async () => {
    const [c] = await service.list();
    expect(c).toEqual({
      id: COURSE,
      slug: 'cloud',
      title: 'Cloud Computing Fundamentals',
      status: 'published',
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

  describe('create', () => {
    it('resolves the category by name, maps display enums to DB enums, and creates the course', async () => {
      const result = await service.create(ADMIN, COURSE_INPUT);

      expect(prisma.courseCategory.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'IT & Business', mode: 'insensitive' } },
      });
      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: CATEGORY,
            level: 'beginner_intermediate',
            badges: ['new_badge'],
            rating: 0,
            ratingCount: 0,
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'course.create', 'course', COURSE, expect.any(Object));
      // The response maps DB enums back to the display strings the editor sent in.
      expect(result.level).toBe('Beginner–Intermediate');
      expect(result.badges).toEqual(['new']);
      expect(result.categoryName).toBe('IT & Business');
    });

    it('creates a new category when no existing one matches the name', async () => {
      prisma.courseCategory.findFirst.mockResolvedValueOnce(null);
      await service.create(ADMIN, COURSE_INPUT);
      expect(prisma.courseCategory.create).toHaveBeenCalledWith({ data: { name: 'IT & Business' } });
    });

    it('rejects an unknown domainId', async () => {
      prisma.courseDomain.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(ADMIN, { ...COURSE_INPUT, domainId: DOMAIN })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('turns a duplicate-slug database error into a 409', async () => {
      prisma.course.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(service.create(ADMIN, COURSE_INPUT)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('404s for an unknown course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.update(ADMIN, COURSE, COURSE_INPUT)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates an existing course and records an audit entry', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE_ROW);
      const result = await service.update(ADMIN, COURSE, COURSE_INPUT);
      expect(prisma.course.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: COURSE } }));
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'course.update', 'course', COURSE, expect.any(Object));
      expect(result.id).toBe(COURSE);
    });
  });

  describe('remove', () => {
    it('soft-deletes the course (deletedAt set, status forced back to draft) rather than hard-deleting it', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(COURSE_ROW);
      await service.remove(ADMIN, COURSE);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: COURSE },
        data: { deletedAt: expect.any(Date), status: 'draft' },
      });
      expect(audit.record).toHaveBeenCalledWith(ADMIN, 'course.delete', 'course', COURSE, expect.any(Object));
    });
  });

  describe('uploadCoverImage', () => {
    const file = (buffer: Buffer): Express.Multer.File =>
      ({ buffer, originalname: 'cover.png', mimetype: 'image/png' }) as Express.Multer.File;

    it('accepts an image at exactly the required 1600x900 cover size', async () => {
      const result = await service.uploadCoverImage(file(makePng(1600, 900)));
      expect(result).toEqual({ url: expect.stringContaining('courses/'), width: 1600, height: 900 });
      expect(supabase.uploadToStorage).toHaveBeenCalledWith('blog-media', expect.stringMatching(/^courses\/.+\.png$/), expect.any(Buffer), 'image/png');
    });

    it('rejects an image with the wrong pixel dimensions', async () => {
      await expect(service.uploadCoverImage(file(makePng(800, 600)))).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
      expect(supabase.uploadToStorage).not.toHaveBeenCalled();
    });

    it('rejects an image that is the right aspect ratio but the wrong absolute size', async () => {
      await expect(service.uploadCoverImage(file(makePng(800, 450)))).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it('rejects a file that is not a readable image at all', async () => {
      await expect(service.uploadCoverImage(file(Buffer.from('not an image')))).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
