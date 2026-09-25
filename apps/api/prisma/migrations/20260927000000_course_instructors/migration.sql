-- Which instructors teach which course (admin-assigned).
CREATE TABLE "course_instructors" (
    "course_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("course_id", "instructor_id")
);

CREATE INDEX "course_instructors_instructor_id_idx" ON "course_instructors"("instructor_id");

ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: defense-in-depth; the API (service role) does the real enforcement.
ALTER TABLE "course_instructors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_instructors_self_select" ON "course_instructors"
  FOR SELECT USING (instructor_id = auth.uid());
CREATE POLICY "course_instructors_admin_all" ON "course_instructors"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
