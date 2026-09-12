-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('pending', 'confirmed', 'unsubscribed');

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'pending',
    "confirm_token" TEXT NOT NULL,
    "unsubscribe_token" TEXT NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "unsubscribed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_confirm_token_key" ON "newsletter_subscribers"("confirm_token");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");

-- CreateTable
CREATE TABLE "webinar_registrations" (
    "id" UUID NOT NULL,
    "webinar_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "region" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webinar_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webinar_registrations_email_webinar_slug_key" ON "webinar_registrations"("email", "webinar_slug");

-- CreateTable
CREATE TABLE "affiliate_applications" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "handle" TEXT,
    "country" TEXT,
    "city" TEXT,
    "referral_code" TEXT,
    "source" TEXT,
    "intent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_applications_pkey" PRIMARY KEY ("id")
);

-- RLS: all four are anonymous public submissions -- no user_id, so no
-- self-select/insert policy exists (there is no "self" to scope to). Only
-- the API's service-role connection writes/reads these; the policies below
-- are defense-in-depth against direct client access, staff-read-only.

ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_messages_staff_all" ON "contact_messages"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_subscribers_staff_all" ON "newsletter_subscribers"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "webinar_registrations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webinar_registrations_staff_all" ON "webinar_registrations"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

ALTER TABLE "affiliate_applications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_applications_staff_all" ON "affiliate_applications"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
