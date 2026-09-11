import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrencyService } from '../../common/currency/currency.service';
import { CoursesService } from './courses.service';

function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

const DOMAIN = {
  id: 'dom-1',
  slug: 'artificial-intelligence',
  name: 'Artificial Intelligence',
  tagline: 'Build intelligent systems.',
  summary: 'AI, ML and MLOps.',
  motif: 'lattice',
  order: 0,
  primary: true,
  image: '/img.jpg',
};

const COURSE_ROW = {
  id: 'crs-1',
  slug: 'ai-engineering',
  title: 'AI Engineering',
  category: { name: 'Artificial Intelligence' },
  domain: DOMAIN,
  summary: 'A comprehensive foundation in AI Engineering.',
  priceUsdCents: 18000,
  priceWasUsdCents: 20000,
  pricing: 'paid',
  level: 'intermediate',
  durationHours: 120,
  durationLabel: '3 Months (120 Hours)',
  rating: decimal(4.5),
  ratingCount: 10,
  enrolledCount: 76,
  badges: ['featured', 'new_badge'],
  instructorId: 'ins-aiit',
  image: '/course.jpg',
  publishedAt: new Date('2026-06-19T00:00:00.000Z'),
};

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: {
    course: { findMany: jest.Mock; findFirst: jest.Mock };
    courseDomain: { findMany: jest.Mock };
  };
  let currency: { resolveCurrency: jest.Mock; convert: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: { findMany: jest.fn(), findFirst: jest.fn() },
      courseDomain: { findMany: jest.fn() },
    };
    currency = { resolveCurrency: jest.fn(), convert: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CurrencyService, useValue: currency },
      ],
    }).compile();

    service = moduleRef.get(CoursesService);
  });

  describe('list', () => {
    it('maps DB rows to CourseListItem, resolving price + badges + level + domain', async () => {
      currency.resolveCurrency.mockReturnValue('NGN');
      currency.convert
        .mockResolvedValueOnce({ currency: 'NGN', amountCents: 27_000_000 })
        .mockResolvedValueOnce({ currency: 'NGN', amountCents: 30_000_000 });
      prisma.course.findMany.mockResolvedValueOnce([COURSE_ROW]);

      const result = await service.list({ headers: {} });

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'published', deletedAt: null } }),
      );
      expect(currency.convert).toHaveBeenNthCalledWith(1, 18000, 'NGN');
      expect(currency.convert).toHaveBeenNthCalledWith(2, 20000, 'NGN');
      expect(result).toEqual([
        {
          id: 'crs-1',
          slug: 'ai-engineering',
          title: 'AI Engineering',
          categoryName: 'Artificial Intelligence',
          domain: {
            id: 'dom-1',
            slug: 'artificial-intelligence',
            name: 'Artificial Intelligence',
            tagline: 'Build intelligent systems.',
            summary: 'AI, ML and MLOps.',
            motif: 'lattice',
            order: 0,
            primary: true,
            image: '/img.jpg',
          },
          summary: 'A comprehensive foundation in AI Engineering.',
          price: {
            usdCents: 18000,
            wasUsdCents: 20000,
            amountCents: 27_000_000,
            wasAmountCents: 30_000_000,
            currency: 'NGN',
          },
          pricing: 'paid',
          level: 'Intermediate',
          durationHours: 120,
          durationLabel: '3 Months (120 Hours)',
          rating: 4.5,
          ratingCount: 10,
          enrolledCount: 76,
          badges: ['featured', 'new'],
          instructorId: 'ins-aiit',
          image: '/course.jpg',
          publishedAt: '2026-06-19T00:00:00.000Z',
        },
      ]);
    });

    it('skips currency conversion for a null (members-only) price', async () => {
      currency.resolveCurrency.mockReturnValue('NGN');
      prisma.course.findMany.mockResolvedValueOnce([
        { ...COURSE_ROW, priceUsdCents: null, priceWasUsdCents: null },
      ]);

      const result = await service.list({ headers: {} });

      expect(currency.convert).not.toHaveBeenCalled();
      expect(result[0].price).toEqual({
        usdCents: null,
        wasUsdCents: null,
        amountCents: null,
        wasAmountCents: null,
        currency: 'NGN',
      });
    });

    it('maps a null domain through to null', async () => {
      currency.resolveCurrency.mockReturnValue('USD');
      currency.convert.mockResolvedValue({ currency: 'USD', amountCents: 18000 });
      prisma.course.findMany.mockResolvedValueOnce([
        { ...COURSE_ROW, domain: null, priceWasUsdCents: null },
      ]);

      const result = await service.list({ headers: {} });
      expect(result[0].domain).toBeNull();
    });
  });

  describe('detail', () => {
    it('returns the full CourseDetail for a published course', async () => {
      currency.resolveCurrency.mockReturnValue('USD');
      currency.convert.mockResolvedValue({ currency: 'USD', amountCents: 18000 });
      prisma.course.findFirst.mockResolvedValueOnce({
        ...COURSE_ROW,
        priceWasUsdCents: null,
        description: 'Full description.',
        outcomes: ['Outcome one'],
        requirements: ['Requirement one'],
        audience: ['Audience one'],
        toolsCovered: ['Tool one'],
        certification: 'Certificate included.',
        publishedAt: new Date('2026-06-19T00:00:00.000Z'),
      });

      const result = await service.detail('ai-engineering', { headers: {} });

      expect(prisma.course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'ai-engineering', status: 'published', deletedAt: null } }),
      );
      expect(result.description).toBe('Full description.');
      expect(result.outcomes).toEqual(['Outcome one']);
      expect(result.publishedAt).toBe('2026-06-19T00:00:00.000Z');
    });

    it('throws NotFoundException for a missing/unpublished course', async () => {
      currency.resolveCurrency.mockReturnValue('USD');
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.detail('missing', { headers: {} })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('curriculum', () => {
    it('returns the ordered modules/lessons for a course', async () => {
      const modules = [{ title: 'Module 1', order: 0, lessons: [] }];
      prisma.course.findFirst.mockResolvedValueOnce({ modules });
      await expect(service.curriculum('ai-engineering')).resolves.toEqual(modules);
    });

    it('throws NotFoundException for a missing/unpublished course', async () => {
      prisma.course.findFirst.mockResolvedValueOnce(null);
      await expect(service.curriculum('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listDomains', () => {
    it('maps CourseDomain rows in order', async () => {
      prisma.courseDomain.findMany.mockResolvedValueOnce([DOMAIN]);
      await expect(service.listDomains()).resolves.toEqual([
        {
          id: 'dom-1',
          slug: 'artificial-intelligence',
          name: 'Artificial Intelligence',
          tagline: 'Build intelligent systems.',
          summary: 'AI, ML and MLOps.',
          motif: 'lattice',
          order: 0,
          primary: true,
          image: '/img.jpg',
        },
      ]);
    });
  });
});
