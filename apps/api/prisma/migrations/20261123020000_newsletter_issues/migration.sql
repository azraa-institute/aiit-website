-- Newsletter broadcast history -- one row per compose-and-send from the
-- admin newsletter page. Sending itself is direct (EmailService/Resend)
-- to every confirmed newsletter_subscribers row, not a Brevo campaign.

CREATE TABLE "newsletter_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "newsletter_issues_pkey" PRIMARY KEY ("id")
);
