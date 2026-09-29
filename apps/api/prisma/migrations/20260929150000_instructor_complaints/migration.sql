-- Lets an instructor file a complaint about a student, reusing the existing
-- complaints table/inbox rather than a parallel system. "user_id" already
-- meant "whoever filed it" at the RLS layer (complaints_self_select/insert
-- use user_id = auth.uid() with no student-only assumption); this just makes
-- that explicit and adds what's needed to tell the two kinds apart.
--
-- The new enum value is kept in its own statement, ahead of anything that
-- could use it: Postgres cannot use a value added by ALTER TYPE ... ADD
-- VALUE within the same transaction that added it (see the CourseLevel
-- precedent in 20260919000000_course_level_extra_values).
ALTER TYPE "ComplaintCategory" ADD VALUE 'student';

ALTER TABLE "complaints" ADD COLUMN "filer_role" TEXT NOT NULL DEFAULT 'student';
ALTER TABLE "complaints" ADD COLUMN "target_student_id" UUID;
CREATE INDEX "complaints_target_student_id_idx" ON "complaints"("target_student_id");
