-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_credential_id_key" ON "certificates"("credential_id");
CREATE UNIQUE INDEX "certificates_user_id_course_id_key" ON "certificates"("user_id", "course_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: self read, staff read/write-all. Real enforcement (issuance is
-- @Roles('admin')-only) lives in CertificatesService via the service-role
-- connection, same pattern as every other table here.

ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_self_select" ON "certificates"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "certificates_staff_all" ON "certificates"
  FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
