-- CreateTable
CREATE TABLE "cookie_consent_logs" (
    "id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "user_id" UUID,
    "analytics" BOOLEAN NOT NULL,
    "preferences" BOOLEAN NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cookie_consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cookie_consent_logs_visitor_id_idx" ON "cookie_consent_logs"("visitor_id");

-- CreateIndex
CREATE INDEX "cookie_consent_logs_user_id_idx" ON "cookie_consent_logs"("user_id");

-- RLS: self read only, no self-insert (written only by the API's
-- service-role connection when a decision is made) and no update/delete
-- policy for anyone, staff included -- this table is an append-only audit
-- trail by design, never edited once written.

ALTER TABLE "cookie_consent_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cookie_consent_logs_self_select" ON "cookie_consent_logs"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cookie_consent_logs_staff_select" ON "cookie_consent_logs"
  FOR SELECT USING (public.is_admin_or_instructor());
