import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

// Only green against a reachable Postgres with the catalogue migration
// applied (CI's ephemeral service does this; there is none in a plain
// local run, see health.e2e-spec.ts). Seeds its own domain/category/course
// directly via Prisma rather than depending on prisma/seed.ts, so it stays
// self-contained and cleans up after itself.
describe('Courses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let domainId: string;
  let categoryId: string;
  let courseId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const domain = await prisma.courseDomain.create({
      data: {
        slug: 'e2e-domain',
        name: 'E2E Domain',
        tagline: 'tagline',
        summary: 'summary',
        motif: 'lattice',
        order: 999,
        primary: false,
        image: '/e2e.jpg',
      },
    });
    domainId = domain.id;

    const category = await prisma.courseCategory.create({
      data: { name: 'E2E Category', domainId },
    });
    categoryId = category.id;

    const course = await prisma.course.create({
      data: {
        slug: 'e2e-course',
        title: 'E2E Course',
        categoryId,
        domainId,
        summary: 'summary',
        description: 'description',
        priceUsdCents: 10000,
        priceWasUsdCents: null,
        pricing: 'paid',
        level: 'beginner',
        durationHours: 10,
        durationLabel: '10 Hours',
        rating: 4.5,
        ratingCount: 3,
        enrolledCount: 1,
        badges: ['featured'],
        image: '/e2e-course.jpg',
        outcomes: [],
        requirements: [],
        audience: [],
        toolsCovered: [],
        certification: 'cert',
        status: 'published',
        publishedAt: new Date(),
      },
    });
    courseId = course.id;

    await prisma.courseModule.create({
      data: {
        courseId,
        title: 'Module 1',
        order: 0,
        lessons: { create: [{ slug: 'e2e-lesson', title: 'Lesson 1', order: 0 }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.courseCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.courseDomain.delete({ where: { id: domainId } }).catch(() => undefined);
    await app.close();
  });

  it('GET /domains includes the seeded domain', async () => {
    const res = await request(app.getHttpServer()).get('/domains').expect(200);
    expect(res.body).toContainEqual(expect.objectContaining({ slug: 'e2e-domain' }));
  });

  it('GET /courses returns the published course with a resolved USD price', async () => {
    const res = await request(app.getHttpServer()).get('/courses').expect(200);
    const course = res.body.find((c: { slug: string }) => c.slug === 'e2e-course');
    expect(course).toMatchObject({
      slug: 'e2e-course',
      title: 'E2E Course',
      categoryName: 'E2E Category',
      price: { usdCents: 10000, amountCents: 10000, currency: 'USD' },
      badges: ['featured'],
    });
  });

  it('GET /courses/:slug returns the full detail payload', async () => {
    const res = await request(app.getHttpServer()).get('/courses/e2e-course').expect(200);
    expect(res.body).toMatchObject({ slug: 'e2e-course', description: 'description' });
  });

  it('GET /courses/:slug returns 404 for an unknown slug', () => {
    return request(app.getHttpServer()).get('/courses/does-not-exist').expect(404);
  });

  it('GET /courses/:slug/curriculum returns the seeded module and lesson', async () => {
    const res = await request(app.getHttpServer()).get('/courses/e2e-course/curriculum').expect(200);
    expect(res.body).toEqual([
      {
        title: 'Module 1',
        order: 0,
        lessons: [{ slug: 'e2e-lesson', title: 'Lesson 1', summary: null, durationMinutes: null }],
      },
    ]);
  });
});
