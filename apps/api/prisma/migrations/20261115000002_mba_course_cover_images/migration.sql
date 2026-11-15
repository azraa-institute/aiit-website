-- Real cover banners for the 3 MBA certification courses (2026-11-15,
-- follow-up to 20261115000000_mba_certification_courses). That migration
-- already ran, so it can't be edited in place -- this swaps the placeholder
-- Plate motif keys ('strata'/'horizon'/'field') for the real,
-- project-owner-supplied banner images now hosted at
-- apps/web/public/assets/courses/.

UPDATE "courses" SET "image" = '/assets/courses/applied-ai-for-markets-and-finance.jpg'
WHERE "slug" = 'applied-ai-for-markets-and-finance';

UPDATE "courses" SET "image" = '/assets/courses/zoho-crm-professional-certification.jpg'
WHERE "slug" = 'zoho-crm-professional-certification';

UPDATE "courses" SET "image" = '/assets/courses/strategic-lead-generation-and-growth-marketing.jpg'
WHERE "slug" = 'strategic-lead-generation-and-growth-marketing';
