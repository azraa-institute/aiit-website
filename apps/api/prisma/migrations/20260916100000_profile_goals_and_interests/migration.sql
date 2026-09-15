-- AlterTable: onboarding-wizard "Goals" step fields -- all nullable, no
-- backfill needed (completeness is computed, not stored; see
-- ProfileService.PROFILE_COMPLETION_FIELDS, which these do NOT join).
ALTER TABLE "profiles" ADD COLUMN "field_of_study" TEXT;
ALTER TABLE "profiles" ADD COLUMN "current_status" TEXT;
ALTER TABLE "profiles" ADD COLUMN "learning_goal" TEXT;
ALTER TABLE "profiles" ADD COLUMN "areas_of_interest" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "profiles" ADD COLUMN "time_zone" TEXT;
