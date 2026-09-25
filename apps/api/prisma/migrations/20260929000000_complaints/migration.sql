-- Student support & complaints. Only admins read these (RLS mirrors that).

CREATE TYPE "ComplaintCategory" AS ENUM ('learning_issue', 'instructor', 'course_content', 'technical', 'payment', 'other');
CREATE TYPE "ComplaintStatus" AS ENUM ('open', 'in_review', 'resolved', 'dismissed');

CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "course_id" UUID,
    "instructor_id" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_messages" (
    "id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaint_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "complaints_status_created_at_idx" ON "complaints"("status", "created_at");
CREATE INDEX "complaints_user_id_idx" ON "complaints"("user_id");
CREATE INDEX "complaint_messages_complaint_id_created_at_idx" ON "complaint_messages"("complaint_id", "created_at");

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: the reporter can read their own complaint and its non-internal messages;
-- admins can do everything. There is deliberately NO instructor policy, so a
-- complaint about an instructor is invisible to instructors even by direct query.
ALTER TABLE "complaints" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaints_self_select" ON "complaints"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "complaints_self_insert" ON "complaints"
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "complaints_admin_all" ON "complaints"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "complaint_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaint_messages_self_select" ON "complaint_messages"
  FOR SELECT USING (
    internal = false AND EXISTS (SELECT 1 FROM "complaints" c WHERE c.id = complaint_id AND c.user_id = auth.uid())
  );
CREATE POLICY "complaint_messages_admin_all" ON "complaint_messages"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
