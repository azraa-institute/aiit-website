-- Affiliate payouts: self-reported payout details (PayPal email or free-text
-- bank fields, so one form works regardless of the affiliate's own country's
-- banking conventions) plus an append-only manual-payout ledger. No live
-- money-movement integration -- an admin records each payout here only
-- after actually sending it themselves.

CREATE TYPE "AffiliatePayoutMethod" AS ENUM ('paypal', 'bank');

ALTER TABLE "affiliates"
  ADD COLUMN "payout_method" "AffiliatePayoutMethod",
  ADD COLUMN "payout_paypal_email" TEXT,
  ADD COLUMN "payout_bank_country" TEXT,
  ADD COLUMN "payout_bank_account_name" TEXT,
  ADD COLUMN "payout_bank_account_number" TEXT,
  ADD COLUMN "payout_bank_name" TEXT,
  ADD COLUMN "payout_bank_code" TEXT,
  ADD COLUMN "payout_updated_at" TIMESTAMPTZ(6);

CREATE TABLE "affiliate_payouts" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "note" TEXT,
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_payouts_affiliate_id_idx" ON "affiliate_payouts"("affiliate_id");

ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: the affiliate can read their own payout history (so their dashboard's
-- "paid so far" is real), but only an admin can ever insert one -- there is
-- deliberately no self-insert/update policy, same reasoning as the
-- affiliates table's own status column.
ALTER TABLE "affiliate_payouts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_payouts_self_select" ON "affiliate_payouts"
  FOR SELECT USING (EXISTS (SELECT 1 FROM "affiliates" a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "affiliate_payouts_admin_all" ON "affiliate_payouts"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
