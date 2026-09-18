-- Drop the leftover "Featured" marketing tag from every course.
UPDATE "courses" SET badges = array_remove(badges, 'featured'::"CourseBadge");
