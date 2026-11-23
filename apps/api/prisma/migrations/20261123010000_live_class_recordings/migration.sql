-- LiveKit Egress room-composite recordings, uploaded straight to Cloudflare
-- R2 (LiveKit's own egress worker does the upload; this table just tracks
-- the async job by LiveKit's egress id).

CREATE TYPE "RecordingStatus" AS ENUM ('starting', 'active', 'complete', 'failed');

CREATE TABLE "recordings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "live_class_id" UUID NOT NULL,
    "egress_id" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'starting',
    "started_by" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "ended_at" TIMESTAMPTZ(6),
    "url" TEXT,
    "duration_seconds" INTEGER,
    "file_size_bytes" BIGINT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recordings_egress_id_key" ON "recordings"("egress_id");

CREATE INDEX "recordings_live_class_id_idx" ON "recordings"("live_class_id");

ALTER TABLE "recordings" ADD CONSTRAINT "recordings_live_class_id_fkey"
    FOREIGN KEY ("live_class_id") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
