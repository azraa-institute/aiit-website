-- Instructor portal: who created an assignment, and course announcements.

ALTER TABLE "assignments" ADD COLUMN "created_by" UUID;

CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "course_id" UUID,
    "author_id" UUID NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'course',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "announcements_course_id_created_at_idx" ON "announcements"("course_id", "created_at");

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: defense-in-depth; the API (service role) does the real enforcement.
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_enrolled_read" ON "announcements"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "enrollments" e
            WHERE e."course_id" = "announcements"."course_id"
              AND e."user_id" = auth.uid()
              AND e."status" != 'cancelled')
  );
CREATE POLICY "announcements_author_read" ON "announcements"
  FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "announcements_admin_all" ON "announcements"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
