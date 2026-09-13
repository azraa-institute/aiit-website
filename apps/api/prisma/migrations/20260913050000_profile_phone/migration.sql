-- AlterTable: plain contact-info field, public schema only, same shape as
-- the existing name/headline columns.
ALTER TABLE "profiles" ADD COLUMN "phone" TEXT;
