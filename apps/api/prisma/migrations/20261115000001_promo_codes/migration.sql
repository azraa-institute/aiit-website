-- Promo-code bundle checkout for the AIIT Bangalore MBA Certification
-- Program (2026-11-15). A single admin-generated code lets up to
-- `max_redemptions` students buy 1-3 of the 3 MBA courses together at a
-- fixed INR price (single_price_cents per course for 1-2 courses,
-- bundle_price_cents per course once all 3 are bought together). Only a
-- successful payment counts against the cap -- see
-- PromoCodesService.redemptionCount, which counts distinct paid Razorpay
-- checkouts (providerRef), not raw Order rows.

CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "course_ids" UUID[] NOT NULL,
    "single_price_cents" INTEGER NOT NULL,
    "bundle_price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "max_redemptions" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- orders.promo_code_id ------------------------------------------------------
ALTER TABLE "orders" ADD COLUMN "promo_code_id" UUID;

ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_fkey"
    FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_promo_code_id_idx" ON "orders"("promo_code_id");

-- Widen the (provider, provider_ref) unique index to include course_id, so
-- several Order rows from one promo-code bundle checkout (one row per
-- bundled course) can share a single Razorpay provider_ref while each row
-- stays individually unique. No behavior change for a normal single-course
-- order, where (provider, provider_ref) was already effectively 1:1 with
-- course_id.
DROP INDEX "orders_provider_provider_ref_key";
CREATE UNIQUE INDEX "orders_provider_provider_ref_course_id_key" ON "orders"("provider", "provider_ref", "course_id");
