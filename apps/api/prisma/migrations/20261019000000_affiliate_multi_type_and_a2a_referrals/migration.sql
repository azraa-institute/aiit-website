-- Affiliate program: one affiliate can now hold multiple types at once
-- (creator + student + affiliate_to_affiliate, any combination) instead of
-- exactly one. Also adds affiliate-to-affiliate attribution: a new
-- affiliate can apply with another affiliate's referral slug as a "coupon
-- code" (see AffiliatesService.createRow()), tracked the same way a
-- student's referred_by_affiliate_id already is on profiles.

ALTER TABLE "affiliates" ADD COLUMN "types" "AffiliateType"[] NOT NULL DEFAULT ARRAY[]::"AffiliateType"[];
UPDATE "affiliates" SET "types" = ARRAY["type"];
ALTER TABLE "affiliates" ALTER COLUMN "types" DROP DEFAULT;
ALTER TABLE "affiliates" DROP COLUMN "type";

ALTER TABLE "affiliates" ADD COLUMN "referred_by_affiliate_id" UUID;
CREATE INDEX "affiliates_referred_by_affiliate_id_idx" ON "affiliates"("referred_by_affiliate_id");
