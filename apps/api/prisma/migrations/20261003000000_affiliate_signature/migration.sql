-- Electronic signature evidence for an affiliate application -- see the
-- schema.prisma comment on these columns. All nullable: the real test
-- application already in production predates this and signed nothing.

ALTER TABLE "affiliates" ADD COLUMN "signed_name" TEXT;
ALTER TABLE "affiliates" ADD COLUMN "agreement_version" TEXT;
ALTER TABLE "affiliates" ADD COLUMN "signed_at" TIMESTAMPTZ(6);
ALTER TABLE "affiliates" ADD COLUMN "signed_ip" TEXT;
