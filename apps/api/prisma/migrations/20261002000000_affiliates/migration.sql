-- Affiliate program: real accounts + admin-screened applications, replacing
-- the old affiliate_applications lead-capture form. Modeled as its own
-- table, not a Profile.role value -- see the schema.prisma comment above
-- the Affiliate model for why.

CREATE TYPE "AffiliateType" AS ENUM ('creator', 'student', 'affiliate_to_affiliate');
CREATE TYPE "AffiliateApplicationStatus" AS ENUM ('pending', 'in_review', 'approved', 'rejected');

CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "AffiliateType" NOT NULL,
    "application_status" "AffiliateApplicationStatus" NOT NULL DEFAULT 'pending',
    "referral_slug" TEXT NOT NULL,
    "phone" TEXT,
    "handle" TEXT,
    "country" TEXT,
    "city" TEXT,
    "source" TEXT,
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");
CREATE UNIQUE INDEX "affiliates_referral_slug_key" ON "affiliates"("referral_slug");

ALTER TABLE "profiles" ADD COLUMN "referred_by_affiliate_id" UUID;

-- RLS: the affiliate can read their own row (dashboard status); only an
-- admin can insert/update/approve -- except the applicant's own INSERT at
-- apply time, which the API performs as that user. There is deliberately
-- no self-UPDATE policy, so even a direct client call could never move an
-- application's own status.
ALTER TABLE "affiliates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliates_self_select" ON "affiliates"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "affiliates_self_insert" ON "affiliates"
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "affiliates_admin_all" ON "affiliates"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
