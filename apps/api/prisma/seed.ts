import { PrismaClient } from '@prisma/client';
import { DOMAINS } from './seed-data/domains';
import { CATEGORIES } from './seed-data/categories';
import { COURSES, type CourseSeed } from './seed-data/courses';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const domainIdBySlug = new Map<string, string>();
  for (const domain of DOMAINS) {
    const record = await prisma.courseDomain.upsert({
      where: { slug: domain.slug },
      create: domain,
      update: domain,
    });
    domainIdBySlug.set(domain.slug, record.id);
  }

  const categoryIdByKey = new Map<string, string>();
  for (const category of CATEGORIES) {
    const domainId = category.domainSlug ? (domainIdBySlug.get(category.domainSlug) ?? null) : null;
    const existing = await prisma.courseCategory.findFirst({ where: { name: category.name } });
    const record = existing
      ? await prisma.courseCategory.update({ where: { id: existing.id }, data: { domainId } })
      : await prisma.courseCategory.create({ data: { name: category.name, domainId } });
    categoryIdByKey.set(category.key, record.id);
  }

  for (const course of COURSES) {
    const categoryId = categoryIdByKey.get(course.categoryKey);
    if (!categoryId) {
      throw new Error(`Seed error: unknown category key "${course.categoryKey}" for course "${course.slug}".`);
    }
    const domainId = course.domainSlug ? (domainIdBySlug.get(course.domainSlug) ?? null) : null;

    const data = toCourseData(course, categoryId, domainId);
    await prisma.course.upsert({
      where: { slug: course.slug },
      create: data,
      update: data,
    });
  }

  console.log(`Seeded ${DOMAINS.length} domains, ${CATEGORIES.length} categories, ${COURSES.length} courses.`);
}

function toCourseData(course: CourseSeed, categoryId: string, domainId: string | null) {
  return {
    slug: course.slug,
    title: course.title,
    categoryId,
    domainId,
    summary: course.summary,
    description: course.description,
    priceUsdCents: course.priceUsdCents,
    priceWasUsdCents: course.priceWasUsdCents,
    pricing: course.pricing,
    level: course.level,
    durationHours: course.durationHours,
    durationLabel: course.durationLabel,
    rating: course.rating,
    ratingCount: course.ratingCount,
    enrolledCount: course.enrolledCount,
    badges: course.badges,
    instructorId: course.instructorId,
    image: course.image,
    outcomes: course.outcomes,
    requirements: course.requirements,
    audience: course.audience,
    toolsCovered: course.toolsCovered,
    certification: course.certification,
    status: course.status,
    publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
