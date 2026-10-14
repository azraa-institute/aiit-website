import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebinarsService } from './webinars.service';

const WEBINAR = {
  id: 'webinar-1',
  slug: 'mastering-modern-tech',
  title: 'Mastering Modern Tech',
  heroHeadline: 'Mastering Modern Tech',
  kicker: 'Free live webinar',
  summary: 'Summary',
  description: 'Description',
  startsAt: null as Date | null,
  scheduleNote: 'To be announced',
  durationLabel: '60-90 mins',
  timezoneNote: 'Africa & Asia friendly',
  platform: 'Zoom',
  language: 'English',
  seatsLimited: true,
  agenda: [{ title: 'AI', points: ['a', 'b'] }],
  audience: ['Students'],
  image: '/img.webp',
  videoUrl: null,
  videoThumbnail: null,
  joinUrl: 'https://zoom.us/j/1',
  status: 'upcoming' as const,
  featured: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WebinarsService', () => {
  let service: WebinarsService;
  let prisma: { webinar: { findMany: jest.Mock; findUnique: jest.Mock }; webinarRegistration: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      webinar: { findMany: jest.fn(), findUnique: jest.fn() },
      webinarRegistration: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [WebinarsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(WebinarsService);
  });

  describe('getBySlug', () => {
    it('throws NotFoundException for an unknown slug', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(null);
      await expect(service.getBySlug('nope')).rejects.toThrow(NotFoundException);
    });

    it('never leaks joinUrl on the public shape', async () => {
      prisma.webinar.findUnique.mockResolvedValueOnce(WEBINAR);
      const result = await service.getBySlug(WEBINAR.slug);
      expect(result).not.toHaveProperty('joinUrl');
    });
  });

  describe('myWebinars', () => {
    it('returns [] with no email, never queries the database', async () => {
      const result = await service.myWebinars(undefined);
      expect(result).toEqual([]);
      expect(prisma.webinarRegistration.findMany).not.toHaveBeenCalled();
    });

    it('matches by email case-insensitively', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([]);
      await service.myWebinars('Ada@Example.com');
      expect(prisma.webinarRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: { equals: 'Ada@Example.com', mode: 'insensitive' } } }),
      );
    });

    it('drops a registration whose webinar was deleted (webinarId set null)', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([{ id: 'reg-1', webinar: null }]);
      const result = await service.myWebinars('ada@example.com');
      expect(result).toEqual([]);
    });

    it('status: attended when attendedAt is set, regardless of startsAt', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([
        { id: 'reg-1', attendedAt: new Date(), webinar: { ...WEBINAR, startsAt: new Date(Date.now() + 86_400_000) } },
      ]);
      const [result] = await service.myWebinars('ada@example.com');
      expect(result.status).toBe('attended');
    });

    it('status: missed when startsAt has passed and never marked attended', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([
        { id: 'reg-1', attendedAt: null, webinar: { ...WEBINAR, startsAt: new Date(Date.now() - 86_400_000) } },
      ]);
      const [result] = await service.myWebinars('ada@example.com');
      expect(result.status).toBe('missed');
    });

    it('status: upcoming when startsAt is in the future or not yet announced', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([
        { id: 'reg-1', attendedAt: null, webinar: { ...WEBINAR, startsAt: null } },
      ]);
      const [result] = await service.myWebinars('ada@example.com');
      expect(result.status).toBe('upcoming');
    });

    it('includes joinUrl here, unlike the public shape', async () => {
      prisma.webinarRegistration.findMany.mockResolvedValueOnce([{ id: 'reg-1', attendedAt: null, webinar: WEBINAR }]);
      const [result] = await service.myWebinars('ada@example.com');
      expect(result.joinUrl).toBe(WEBINAR.joinUrl);
    });
  });
});
