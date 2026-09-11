-- CreateEnum
CREATE TYPE "Role" AS ENUM ('learner', 'admin', 'instructor');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'learner',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
-- auth.users is Supabase-managed and intentionally not a Prisma model (see
-- schema.prisma) — this FK is raw SQL rather than a Prisma relation. Any
-- environment applying this migration (including CI's ephemeral Postgres)
-- must have an auth.users(id) table to reference before this statement runs.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
