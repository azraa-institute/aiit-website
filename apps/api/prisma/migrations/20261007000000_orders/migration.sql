-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('paypal', 'razorpay', 'paystack');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_ref" TEXT,
    "currency" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_provider_provider_ref_key" ON "orders"("provider", "provider_ref");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: self read-only, staff read/update-all. Deliberately NO self-insert
-- (unlike enrollments) -- an Order is only ever created by the API's
-- service-role connection after a provider confirms the amount, never
-- directly by a client. The API connects via the service role (bypasses
-- RLS) for its own writes; these policies are defense-in-depth, matching
-- the enrollments/notifications pattern.

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_self_select" ON "orders"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "orders_staff_read_all" ON "orders"
  FOR SELECT USING (public.is_admin_or_instructor());
CREATE POLICY "orders_staff_update" ON "orders"
  FOR UPDATE USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
