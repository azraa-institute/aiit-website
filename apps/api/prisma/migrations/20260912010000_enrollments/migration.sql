-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_course_id_key" ON "enrollments"("user_id", "course_id");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: self read/insert, staff read/update-all. The API connects via the
-- service role (bypasses RLS) for its own writes -- enforcement of "only
-- free courses can be self-enrolled" lives in EnrollmentsService, not here.
-- These policies are defense-in-depth, matching the profiles/courses pattern.

ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_self_select" ON "enrollments"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "enrollments_self_insert" ON "enrollments"
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "enrollments_staff_read_all" ON "enrollments"
  FOR SELECT USING (public.is_admin_or_instructor());
CREATE POLICY "enrollments_staff_update" ON "enrollments"
  FOR UPDATE USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
