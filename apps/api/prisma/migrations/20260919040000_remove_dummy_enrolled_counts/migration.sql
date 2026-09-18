-- The public enrolled figure is now counted live from "enrollments"; the old
-- hand-entered marketing numbers are zeroed. Column dropped in a later migration.
UPDATE "courses" SET enrolled_count = 0;
