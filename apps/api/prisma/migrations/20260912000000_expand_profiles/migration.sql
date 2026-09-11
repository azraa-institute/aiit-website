-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('active', 'suspended', 'pending_deletion');

-- AlterTable
ALTER TABLE "profiles"
  ADD COLUMN "status" "ProfileStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "name" TEXT,
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "country" CHAR(2),
  ADD COLUMN "avatar_key" TEXT,
  ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "deletion_requested_at" TIMESTAMPTZ(6);

-- Role-check helpers, SECURITY DEFINER so RLS policies that call them don't
-- recurse back into RLS on profiles itself (the classic self-referential
-- RLS footgun). is_admin_or_instructor is defined here (not with the
-- catalogue migration that first uses it) since it's the same category of
-- helper as is_admin -- both belong with the auth/role plumbing.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'));
$$;

-- RLS: self read/write, admin read-all. The API connects via the service
-- role (which bypasses RLS) for its own queries -- these policies are
-- defense-in-depth, not the primary access-control mechanism.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_select" ON "profiles"
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON "profiles"
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_select_all" ON "profiles"
  FOR SELECT USING (public.is_admin());
