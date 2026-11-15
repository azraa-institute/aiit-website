-- A real, server-side shopping cart (2026-11-16). "This user's cart" is
-- just their cart_items rows, no wrapping cart entity. Paid courses only,
-- removed automatically once the matching order is marked paid (see
-- PaymentsService.markOrderPaid).

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_items_user_id_course_id_key" ON "cart_items"("user_id", "course_id");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
