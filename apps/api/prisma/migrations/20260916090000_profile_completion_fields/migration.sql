-- AlterTable: mandatory-profile-completion fields. All nullable -- existing
-- rows can't retroactively have this data; completeness is computed at the
-- application layer (ProfileService.toMe), not enforced as a DB constraint.
-- phone_verified_at is only ever set server-side after confirming the
-- *auth* user's phone_confirmed_at via the Supabase Admin API -- see
-- ProfileService.confirmPhoneVerification.
ALTER TABLE "profiles" ADD COLUMN "phone_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "profiles" ADD COLUMN "qualification" TEXT;
ALTER TABLE "profiles" ADD COLUMN "university" TEXT;
ALTER TABLE "profiles" ADD COLUMN "city" TEXT;
ALTER TABLE "profiles" ADD COLUMN "address" TEXT;
ALTER TABLE "profiles" ADD COLUMN "postal_code" TEXT;
