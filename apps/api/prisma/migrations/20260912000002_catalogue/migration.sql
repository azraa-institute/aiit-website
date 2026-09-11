-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');
CREATE TYPE "PricingModel" AS ENUM ('paid', 'free', 'subscription');
CREATE TYPE "CourseBadge" AS ENUM ('featured', 'new_badge', 'hot', 'special', 'coming_soon');
CREATE TYPE "CourseLifecycleStatus" AS ENUM ('draft', 'published');
CREATE TYPE "DomainMotif" AS ENUM ('lattice', 'flow', 'strata', 'field', 'horizon', 'depth', 'mesh', 'signal');

-- CreateTable
CREATE TABLE "course_domains" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "motif" "DomainMotif" NOT NULL,
    "order" INTEGER NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "domain_id" UUID,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_usd_cents" INTEGER,
    "price_was_usd_cents" INTEGER,
    "pricing" "PricingModel" NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "duration_label" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "rating_count" INTEGER NOT NULL,
    "enrolled_count" INTEGER NOT NULL DEFAULT 0,
    "badges" "CourseBadge"[],
    "instructor_id" TEXT,
    "image" TEXT NOT NULL,
    "outcomes" TEXT[],
    "requirements" TEXT[],
    "audience" TEXT[],
    "tools_covered" TEXT[],
    "certification" TEXT NOT NULL,
    "status" "CourseLifecycleStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_resources" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_domains_slug_key" ON "course_domains"("slug");
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- AddForeignKey
ALTER TABLE "course_categories" ADD CONSTRAINT "course_categories_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "course_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "course_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "course_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_resources" ADD CONSTRAINT "lesson_resources_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: published = public read, write = admin/instructor. public.is_admin_or_instructor()
-- is defined in the 20260912000000_expand_profiles migration, reused here rather than
-- redefined. course_modules/lessons/lesson_resources public-read policies walk the FK
-- chain up to the owning course's published+not-deleted state.

ALTER TABLE "course_domains" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_domains_public_read" ON "course_domains" FOR SELECT USING (true);
CREATE POLICY "course_domains_staff_write" ON "course_domains"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "course_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_categories_public_read" ON "course_categories" FOR SELECT USING (true);
CREATE POLICY "course_categories_staff_write" ON "course_categories"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_public_read" ON "courses"
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "courses_staff_read_all" ON "courses"
  FOR SELECT USING (public.is_admin_or_instructor());
CREATE POLICY "courses_staff_insert" ON "courses"
  FOR INSERT WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "courses_staff_update" ON "courses"
  FOR UPDATE USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "courses_staff_delete" ON "courses"
  FOR DELETE USING (public.is_admin_or_instructor());

ALTER TABLE "course_modules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_modules_public_read" ON "course_modules"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "courses" c
            WHERE c."id" = "course_id" AND c."status" = 'published' AND c."deleted_at" IS NULL)
  );
CREATE POLICY "course_modules_staff_all" ON "course_modules"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_public_read" ON "lessons"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "course_modules" m JOIN "courses" c ON c."id" = m."course_id"
            WHERE m."id" = "module_id" AND c."status" = 'published' AND c."deleted_at" IS NULL)
  );
CREATE POLICY "lessons_staff_all" ON "lessons"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "lesson_resources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_resources_public_read" ON "lesson_resources"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "lessons" l
            JOIN "course_modules" m ON m."id" = l."module_id"
            JOIN "courses" c ON c."id" = m."course_id"
            WHERE l."id" = "lesson_id" AND c."status" = 'published' AND c."deleted_at" IS NULL)
  );
CREATE POLICY "lesson_resources_staff_all" ON "lesson_resources"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
