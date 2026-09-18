-- Real cover photos for the three courses that were using generated motif art
-- (image = 'lattice' / 'flow' / 'mesh'). Files live in apps/web/public/assets/courses/.
UPDATE "courses" SET image = '/assets/courses/agentic-ai-and-autonomous-ai-systems.jpg' WHERE slug = 'agentic-ai-and-autonomous-ai-systems';
UPDATE "courses" SET image = '/assets/courses/digital-marketing-fundamentals.jpg' WHERE slug = 'digital-marketing-fundamentals';
UPDATE "courses" SET image = '/assets/courses/it-business-management-fundamentals.jpg' WHERE slug = 'it-business-management-fundamentals';
