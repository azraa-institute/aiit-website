-- Add the 3 new CourseLevel values used by the 2026-09 catalogue taxonomy
-- update (absolute_beginner, beginner_intermediate, intermediate_advanced).
-- Kept in its own migration/transaction, ahead of the one that assigns them
-- to any course row: Postgres cannot use an enum value added by
-- ALTER TYPE ... ADD VALUE within the same transaction that added it.
ALTER TYPE "CourseLevel" ADD VALUE 'absolute_beginner';
ALTER TYPE "CourseLevel" ADD VALUE 'beginner_intermediate';
ALTER TYPE "CourseLevel" ADD VALUE 'intermediate_advanced';
