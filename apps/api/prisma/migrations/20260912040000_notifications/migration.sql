-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('course', 'certificate', 'assignment', 'webinar', 'system');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- RLS: self read/update only. No self-insert policy -- notifications are
-- only ever written by the API's service-role connection, from real events
-- (enrollment, grading, certificate issuance), never by a client directly.

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_self_select" ON "notifications"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_self_update" ON "notifications"
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_staff_all" ON "notifications"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
