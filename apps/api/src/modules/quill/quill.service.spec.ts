import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { CourseDetail, CourseListItem } from '@aiit/shared';
import { CoursesService } from '../courses/courses.service';
import { QuillService } from './quill.service';
import { QuillChatDto } from './dto/quill-chat.dto';

const COURSE: CourseDetail = {
  id: 'crs-1',
  slug: 'ai-engineering',
  title: 'AI Engineering',
  categoryName: 'Generative & Agentic AI',
  catalogueCategory: { slug: 'artificial-intelligence-intelligent-systems', name: 'Artificial Intelligence & Intelligent Systems' },
  domain: null,
  summary: 'A comprehensive foundation in AI Engineering.',
  price: { usdCents: 18000, wasUsdCents: 20000, amountCents: 18000, wasAmountCents: 20000, currency: 'USD' },
  pricing: 'paid',
  level: 'Intermediate',
  durationHours: 120,
  durationLabel: '3 Months (120 Hours)',
  rating: 4.5,
  ratingCount: 10,
  enrolledCount: 42,
  badges: ['featured'],
  instructorId: 'ins-1',
  image: '/course.jpg',
  publishedAt: '2026-06-19T00:00:00.000Z',
  technologies: [{ name: 'PyTorch', type: 'framework', icon: 'spark', tier: 'core' }],
  description: 'A full description of the course.',
  outcomes: ['Build production AI systems', 'Deploy ML models at scale'],
  requirements: ['Basic Python'],
  audience: ['developers moving into AI'],
  toolsCovered: ['PyTorch'],
  certification: 'A verifiable AIIT certificate on completion.',
};

const COURSE_LIST: CourseListItem[] = [COURSE, { ...COURSE, id: 'crs-2', slug: 'data-science', title: 'Data Science & Analytics' }];

function dto(message: string, overrides: Partial<QuillChatDto> = {}): QuillChatDto {
  const d = new QuillChatDto();
  d.message = message;
  d.courseSlug = 'ai-engineering';
  Object.assign(d, overrides);
  return d;
}

/** No courseSlug -- the site-wide floating-launcher path (see respondGeneral). */
function generalDto(message: string, overrides: Partial<QuillChatDto> = {}): QuillChatDto {
  const d = new QuillChatDto();
  d.message = message;
  Object.assign(d, overrides);
  return d;
}

describe('QuillService', () => {
  let service: QuillService;
  let courses: { detail: jest.Mock; list: jest.Mock; curriculum: jest.Mock };

  beforeEach(async () => {
    courses = { detail: jest.fn().mockResolvedValue(COURSE), list: jest.fn().mockResolvedValue(COURSE_LIST), curriculum: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [QuillService, { provide: CoursesService, useValue: courses }],
    }).compile();

    service = moduleRef.get(QuillService);
  });

  it('propagates NotFoundException for an unknown course', async () => {
    courses.detail.mockRejectedValueOnce(new NotFoundException('Course not found.'));
    await expect(service.respond(dto('hi'), {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers a price question with the resolved currency and discount', async () => {
    const result = await service.respond(dto('how much does this cost?'), {});
    expect(result.matched).toBe(true);
    expect(result.escalate).toBe(false);
    expect(result.reply).toContain('$180');
    expect(result.reply).toContain('$200');
    expect(result.links.some((l) => l.kind === 'enroll')).toBe(true);
  });

  it('answers free pricing without a discount line', async () => {
    courses.detail.mockResolvedValueOnce({ ...COURSE, pricing: 'free', price: { ...COURSE.price, amountCents: 0, wasAmountCents: null } });
    const result = await service.respond(dto('what is the price'), {});
    expect(result.reply).toContain('completely free');
  });

  it('answers a career-impact question using outcomes and certification', async () => {
    const result = await service.respond(dto('will this help my career and get me a job?'), {});
    expect(result.reply).toContain('AI Engineering');
    expect(result.reply).toContain('verifiable AIIT certificate');
  });

  it('answers a curriculum question using technologies and outcomes', async () => {
    const result = await service.respond(dto('what will I learn, what topics are covered?'), {});
    expect(result.reply).toContain('PyTorch');
    expect(result.reply).toContain('Build production AI systems');
  });

  it('answers an enrollment question with pricing-aware guidance', async () => {
    const result = await service.respond(dto('how do I enroll?'), {});
    expect(result.reply).toContain('Enroll now');
    expect(result.links.some((l) => l.kind === 'enroll')).toBe(true);
  });

  it('escalates immediately on an explicit request for a human', async () => {
    const result = await service.respond(dto('I want to talk to a human'), {});
    expect(result.escalate).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.links.some((l) => l.kind === 'whatsapp')).toBe(true);
    expect(result.links.some((l) => l.kind === 'email')).toBe(true);
  });

  it('gives an unmatched message a soft fallback without escalating on the first miss', async () => {
    const result = await service.respond(dto('asdkjasdkj random gibberish'), {});
    expect(result.matched).toBe(false);
    expect(result.escalate).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('escalates an unmatched message after a second consecutive miss', async () => {
    const result = await service.respond(dto('asdkjasdkj random gibberish', { missCount: 1 }), {});
    expect(result.matched).toBe(true);
    expect(result.escalate).toBe(true);
  });

  it('prioritises a substantive topic over a greeting in a compound message', async () => {
    const result = await service.respond(dto('hi, how much does it cost?'), {});
    expect(result.reply).toContain('$180');
  });

  describe('general mode (no courseSlug)', () => {
    it('lists real courses from the catalogue without fetching a single course', async () => {
      const result = await service.respond(generalDto('what courses do you offer?'), {});
      expect(courses.detail).not.toHaveBeenCalled();
      expect(courses.list).toHaveBeenCalled();
      expect(result.reply).toContain('AI Engineering');
      expect(result.reply).toContain('Data Science & Analytics');
      expect(result.links.some((l) => l.kind === 'courses')).toBe(true);
    });

    it('answers a curated general fact without hitting the catalogue', async () => {
      const result = await service.respond(generalDto('what is AIIT?'), {});
      expect(courses.list).not.toHaveBeenCalled();
      expect(result.reply).toContain('Azraa Institute');
      expect(result.matched).toBe(true);
    });

    it('escalates an explicit human request with no course to reference', async () => {
      const result = await service.respond(generalDto('can I talk to a human'), {});
      expect(result.escalate).toBe(true);
      expect(result.links.some((l) => l.kind === 'whatsapp')).toBe(true);
    });

    it('gives a general pricing answer grounded in the catalogue, not one course', async () => {
      const result = await service.respond(generalDto('how much do your courses cost?'), {});
      expect(result.reply).toContain('Pricing varies');
      expect(result.links.some((l) => l.kind === 'courses')).toBe(true);
    });

    it('escalates an unmatched general message after a second consecutive miss', async () => {
      const result = await service.respond(generalDto('asdkjasdkj random gibberish', { missCount: 1 }), {});
      expect(result.matched).toBe(true);
      expect(result.escalate).toBe(true);
    });
  });
});
