-- Fixes literal " -- " left in 6 courses' summary/description text (2026-11-15),
-- found on a live site-wide sweep for the project's standing no-em-dash
-- convention. These rows were seeded by 20260919010000_course_catalogue_taxonomy
-- and this session's own 20261115000000_mba_certification_courses -- both
-- already applied, so corrected here rather than edited in place.
-- seed-data/courses.ts carries the same corrected text for a fresh local DB.

UPDATE "courses" SET summary = 'Design, build and deploy autonomous AI agents that plan, use tools and work together, going beyond prompting to real agentic systems.'
WHERE "slug" = 'agentic-ai-and-autonomous-ai-systems';

UPDATE "courses" SET summary = 'A practical introduction to digital marketing: SEO, paid advertising, social media, content and email marketing, and the analytics behind them.'
WHERE "slug" = 'digital-marketing-fundamentals';

UPDATE "courses" SET summary = 'A technology-focused introduction to IT business management: governance, service management, project delivery and digital transformation for IT-driven organisations.'
WHERE "slug" = 'it-business-management-fundamentals';

UPDATE "courses" SET summary = 'A 4-week, tool-based introduction to using AI for market research and financial analysis, for first-year MBA students.'
WHERE "slug" = 'applied-ai-for-markets-and-finance';

UPDATE "courses" SET summary = 'A 4-week, hands-on Zoho CRM certification track covering setup, lead management, pipeline analytics and automation, for first-year MBA students.'
WHERE "slug" = 'zoho-crm-professional-certification';

UPDATE "courses" SET
    summary = 'A 4-week, tool-based lead generation and growth marketing track covering funnels, channels, outbound and CRM integration, for first-year MBA students.',
    description = 'Part of the AIIT Bangalore MBA Certification Program. Participants build an ideal-customer-profile and buyer-persona worksheet, plan a multi-channel lead generation strategy across SEO, content, LinkedIn and paid ads, then run outbound campaigns (cold email sequencing and LinkedIn outreach) synced into Zoho CRM. The course closes with landing-page optimisation, A/B testing and lead scoring, and a capstone go-to-market plan.'
WHERE "slug" = 'strategic-lead-generation-and-growth-marketing';
