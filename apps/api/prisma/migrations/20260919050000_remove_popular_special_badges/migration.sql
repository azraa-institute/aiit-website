-- Drop the "Popular" (hot) and "Special" marketing tags from every course.
UPDATE "courses" SET badges = array_remove(array_remove(badges, 'hot'::"CourseBadge"), 'special'::"CourseBadge");
