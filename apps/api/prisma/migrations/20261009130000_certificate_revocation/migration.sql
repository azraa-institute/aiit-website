-- AlterTable
ALTER TABLE "public"."certificates" ADD COLUMN     "revoked_at" TIMESTAMPTZ(6),
ADD COLUMN     "revoked_reason" TEXT;
