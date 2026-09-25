-- Live classes: admin-built timetables -> generated live_classes, plus
-- attendance. Video itself runs on LiveKit Cloud; this only holds schedule
-- and attendance. See the "Live classes (LiveKit)" note in schema.prisma.

CREATE TYPE "LiveClassStatus" AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

CREATE TABLE "timetables" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "host_user_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_slots" (
    "id" UUID NOT NULL,
    "timetable_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_classes" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "timetable_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "LiveClassStatus" NOT NULL DEFAULT 'scheduled',
    "host_user_id" UUID,
    "room_name" TEXT NOT NULL,
    "join_opens_minutes" INTEGER NOT NULL DEFAULT 15,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_class_attendance" (
    "id" UUID NOT NULL,
    "live_class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_joined_at" TIMESTAMPTZ(6) NOT NULL,
    "last_joined_at" TIMESTAMPTZ(6),
    "last_left_at" TIMESTAMPTZ(6),
    "total_seconds" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "live_class_attendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timetables_course_id_idx" ON "timetables"("course_id");
CREATE UNIQUE INDEX "timetable_slots_timetable_id_weekday_start_time_key" ON "timetable_slots"("timetable_id", "weekday", "start_time");
CREATE UNIQUE INDEX "live_classes_room_name_key" ON "live_classes"("room_name");
CREATE UNIQUE INDEX "live_classes_timetable_id_starts_at_key" ON "live_classes"("timetable_id", "starts_at");
CREATE INDEX "live_classes_course_id_starts_at_idx" ON "live_classes"("course_id", "starts_at");
CREATE INDEX "live_classes_host_user_id_idx" ON "live_classes"("host_user_id");
CREATE UNIQUE INDEX "live_class_attendance_live_class_id_user_id_key" ON "live_class_attendance"("live_class_id", "user_id");

ALTER TABLE "timetables" ADD CONSTRAINT "timetables_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_class_attendance" ADD CONSTRAINT "live_class_attendance_live_class_id_fkey" FOREIGN KEY ("live_class_id") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: defense-in-depth, same as assignments/enrollments -- the API connects
-- with the service role and does the real enforcement in LiveClassesService.
ALTER TABLE "timetables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetables_admin_all" ON "timetables"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "timetable_slots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_slots_admin_all" ON "timetable_slots"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "live_classes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_classes_enrolled_read" ON "live_classes"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "enrollments" e
            WHERE e."course_id" = "live_classes"."course_id"
              AND e."user_id" = auth.uid()
              AND e."status" != 'cancelled')
  );
CREATE POLICY "live_classes_host_read" ON "live_classes"
  FOR SELECT USING (host_user_id = auth.uid());
CREATE POLICY "live_classes_admin_all" ON "live_classes"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "live_class_attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_class_attendance_self_select" ON "live_class_attendance"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "live_class_attendance_admin_all" ON "live_class_attendance"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
