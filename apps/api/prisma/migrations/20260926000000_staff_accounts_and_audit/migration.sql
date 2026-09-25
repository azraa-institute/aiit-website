-- Staff accounts (admin/instructor) are created by an admin, not by sign-up,
-- and any account can be suspended. Plus an append-only audit log.

ALTER TABLE "profiles"
  ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
  ADD COLUMN "suspended_reason" TEXT,
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "created_by" UUID;

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- RLS: defense-in-depth; the API (service role) does the real enforcement.
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_admin_select" ON "audit_logs"
  FOR SELECT USING (public.is_admin());
