-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "file_key" TEXT,
    "note" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "grade" TEXT,
    "feedback" TEXT,
    "graded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignment_id_user_id_key" ON "assignment_submissions"("assignment_id", "user_id");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: defense-in-depth, matching the enrollments pattern -- the API writes
-- via the service role and does the real enforcement (enrollment checks,
-- grading requires @Roles('admin')) in AssignmentsService.

ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_enrolled_read" ON "assignments"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "enrollments" e
            WHERE e."course_id" = "assignments"."course_id"
              AND e."user_id" = auth.uid()
              AND e."status" != 'cancelled')
  );
CREATE POLICY "assignments_staff_all" ON "assignments"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "assignment_submissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignment_submissions_self_select" ON "assignment_submissions"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "assignment_submissions_self_insert" ON "assignment_submissions"
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "assignment_submissions_self_update" ON "assignment_submissions"
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "assignment_submissions_staff_all" ON "assignment_submissions"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
