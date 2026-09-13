-- AlterTable: added nullable first, backfilled, then locked to NOT NULL --
-- safe whether or not any certificates already exist (none have been
-- issued through the admin-only endpoint yet, but this doesn't assume
-- that).
ALTER TABLE "certificates" ADD COLUMN "holder_name" TEXT;

UPDATE "certificates" c
SET holder_name = COALESCE(p.name, 'AIIT Learner')
FROM "profiles" p
WHERE c.user_id = p.id AND c.holder_name IS NULL;

ALTER TABLE "certificates" ALTER COLUMN "holder_name" SET NOT NULL;
