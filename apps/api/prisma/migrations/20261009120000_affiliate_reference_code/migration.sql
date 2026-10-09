-- AlterTable
ALTER TABLE "public"."affiliates" ADD COLUMN     "activated_at" TIMESTAMPTZ(6),
ADD COLUMN     "reference_code" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_reference_code_key" ON "public"."affiliates"("reference_code");

