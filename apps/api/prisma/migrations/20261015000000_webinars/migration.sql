-- Admin-manageable webinar/event catalog (replaces the single hardcoded
-- entry in apps/web/src/data/webinars.ts), plus refund tracking on orders
-- and reminder-email bookkeeping on webinar registrations.

CREATE TYPE "WebinarStatus" AS ENUM ('upcoming', 'live', 'past');

CREATE TABLE "webinars" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hero_headline" TEXT NOT NULL,
    "kicker" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6),
    "schedule_note" TEXT NOT NULL,
    "duration_label" TEXT NOT NULL,
    "timezone_note" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "seats_limited" BOOLEAN NOT NULL DEFAULT true,
    "agenda" JSONB NOT NULL,
    "audience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "image" TEXT NOT NULL,
    "video_url" TEXT,
    "video_thumbnail" TEXT,
    "join_url" TEXT,
    "status" "WebinarStatus" NOT NULL DEFAULT 'upcoming',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webinars_slug_key" ON "webinars"("slug");

ALTER TABLE "webinar_registrations"
  ADD COLUMN "webinar_id" UUID,
  ADD COLUMN "confirmation_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "reminder_24h_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "reminder_30m_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "attended_at" TIMESTAMPTZ(6);

ALTER TABLE "webinar_registrations"
  ADD CONSTRAINT "webinar_registrations_webinar_id_fkey"
  FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "webinar_registrations_webinar_id_idx" ON "webinar_registrations"("webinar_id");

ALTER TABLE "orders"
  ADD COLUMN "refunded_at" TIMESTAMPTZ(6),
  ADD COLUMN "refund_ref" TEXT;

-- Seed the one real webinar that already exists today (its content lived
-- only in apps/web/src/data/webinars.ts until now) so the public page has
-- real data immediately, and so existing registrations below have a row
-- to backfill webinar_id against.
INSERT INTO "webinars" (
  "id", "slug", "title", "hero_headline", "kicker", "summary", "description",
  "starts_at", "schedule_note", "duration_label", "timezone_note", "platform",
  "language", "seats_limited", "agenda", "audience", "image", "video_url",
  "video_thumbnail", "join_url", "status", "featured"
) VALUES (
  gen_random_uuid(),
  'mastering-modern-information-technology',
  'One Live Session. A Smarter Start in Tech.',
  'Mastering Modern Information Technology',
  'AIIT Academy presents · Free live webinar',
  'Explore Artificial Intelligence, Cyber Security and Blockchain in one practical, beginner-friendly session. Discover what each field offers, where the opportunities are, and how to take your first step.',
  'A practical, beginner-friendly overview of where the opportunities are in Artificial Intelligence, Cyber Security and Blockchain, and how AIIT helps you get there. No registration fee · Certificate-track guidance included · Runs 60–90 minutes.',
  NULL,
  'To be announced',
  '60–90 mins',
  'Africa & Asia friendly',
  'Zoom / Google Meet',
  'English',
  true,
  '[
    {"title": "Artificial Intelligence", "points": ["Overview of AI, Machine Learning & Generative AI", "Real-world applications across industries", "Career opportunities in AI Engineering", "How beginners can start learning AI with AIIT"]},
    {"title": "Cyber Security & Ethical Hacking", "points": ["Why cyber security matters today", "Common threats and how to protect systems", "Introduction to Ethical Hacking concepts", "Career paths & certifications, including Cisco CCNA"]},
    {"title": "Blockchain Technology", "points": ["What blockchain is and how it works", "Use cases beyond cryptocurrency", "Opportunities in blockchain development", "How AIIT introduces Blockchain to learners"]}
  ]'::jsonb,
  ARRAY[
    'Students and graduates interested in IT, AI, Cyber Security or Blockchain',
    'Working professionals looking to upskill or change career direction',
    'Anyone curious about the future of technology and digital skills',
    'Partners and associations who want to introduce these programmes to their members'
  ],
  '/assets/webinar/aiit-free-webinar.webp',
  'https://media.aiit.network/media/video/4bdca149-d8ea-436b-8591-5cae3e83983f.mp4',
  '/assets/webinar/aiit-webinar-thumbnail.webp',
  NULL,
  'upcoming',
  true
);

UPDATE "webinar_registrations" r
SET "webinar_id" = w."id"
FROM "webinars" w
WHERE r."webinar_slug" = w."slug" AND r."webinar_id" IS NULL;

ALTER TABLE "webinars" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webinars_public_read" ON "webinars"
  FOR SELECT USING (true);
CREATE POLICY "webinars_admin_insert" ON "webinars"
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "webinars_admin_update" ON "webinars"
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "webinars_admin_delete" ON "webinars"
  FOR DELETE USING (public.is_admin());
