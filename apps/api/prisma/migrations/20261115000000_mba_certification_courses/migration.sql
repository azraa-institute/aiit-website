-- AIIT Bangalore MBA Certification Program (2026-11-15).
-- Adds the 3 modular, one-month, tool-based courses described in
-- AIIT_Bangalore_MBA_Certification_Program.pdf, sold to first-year MBA
-- students alongside the normal catalogue at the standard $150 USD price.
-- Reuses the existing 'IT Business Management' and 'Digital Marketing'
-- course_categories rows created by 20260919010000_course_catalogue_taxonomy
-- (resolved by name via subquery, same as that migration's own new-course
-- inserts) -- no new category needed. `image` uses a Plate motif key (no
-- real photo asset exists yet for these new courses), same choice already
-- made for the other 2 most-recently-added courses in this same migration
-- family (digital-marketing-fundamentals / it-business-management-fundamentals).
-- seed-data/courses.ts carries the equivalent 3 entries for a fresh local
-- database; this migration is what actually reaches production, since
-- seed.ts is not part of the automatic deploy pipeline.

INSERT INTO "courses" (
    "id", "slug", "title", "category_id", "domain_id", "catalogue_category",
    "technologies", "summary", "description", "price_usd_cents",
    "price_was_usd_cents", "pricing", "level", "duration_hours",
    "duration_label", "rating", "rating_count", "enrolled_count", "badges",
    "instructor_id", "image", "outcomes", "requirements", "audience",
    "tools_covered", "certification", "status", "published_at"
) VALUES (
    gen_random_uuid(),
    'applied-ai-for-markets-and-finance',
    'Applied AI for Markets & Finance',
    (SELECT id FROM "course_categories" WHERE name = 'IT Business Management'),
    NULL,
    'technology-management-business',
    '[{"name": "ChatGPT", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Claude", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Copilot", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Prompt Engineering", "type": "concept", "icon": "chatbubble", "tier": "core"}, {"name": "AI-Assisted Market Research", "type": "concept", "icon": "search", "tier": "core"}, {"name": "Financial Analysis", "type": "concept", "icon": "chart", "tier": "core"}, {"name": "AI Dashboards", "type": "tool", "icon": "chart", "tier": "optional"}]'::jsonb,
    'A 4-week, tool-based introduction to using AI for market research and financial analysis -- for first-year MBA students.',
    'Part of the AIIT Bangalore MBA Certification Program. Participants survey today''s leading AI tools (ChatGPT, Claude, Copilot and finance-specific AI platforms), then apply them to real market-research and financial-analysis workflows: sentiment analysis, competitor research, trend forecasting, budgeting and risk scoring. The course closes with a capstone AI-powered market/finance mini-workflow and a look at the limitations and responsible use of financial AI.',
    15000,
    NULL,
    'paid',
    'beginner_intermediate',
    24,
    '4 Weeks (12 Live Sessions, 2 Hours Each)',
    0, 0, 0,
    '{new_badge}',
    'ins-aiit',
    'strata',
    ARRAY['Survey and compare leading AI tools for market and financial research','Apply AI-assisted sentiment analysis and competitor research techniques','Build an AI-generated market brief on an assigned sector','Use AI tools for budgeting, forecasting and risk scoring','Produce an AI-assisted financial health report on a listed company','Build a small AI-powered market/finance workflow end to end','Recognize the bias and limitations of financial AI tools']::TEXT[],
    ARRAY['Basic computer literacy','First-year MBA student (or equivalent)','Access to a computer with internet connectivity']::TEXT[],
    ARRAY['First-year MBA students','Finance and markets professionals exploring AI tools']::TEXT[],
    ARRAY['ChatGPT','Claude','Copilot','AI Dashboards']::TEXT[],
    'Certificate included · Certified by AIIT · PC or Mobile',
    'published',
    now()
);

INSERT INTO "courses" (
    "id", "slug", "title", "category_id", "domain_id", "catalogue_category",
    "technologies", "summary", "description", "price_usd_cents",
    "price_was_usd_cents", "pricing", "level", "duration_hours",
    "duration_label", "rating", "rating_count", "enrolled_count", "badges",
    "instructor_id", "image", "outcomes", "requirements", "audience",
    "tools_covered", "certification", "status", "published_at"
) VALUES (
    gen_random_uuid(),
    'zoho-crm-professional-certification',
    'Zoho CRM Professional Certification',
    (SELECT id FROM "course_categories" WHERE name = 'IT Business Management'),
    NULL,
    'technology-management-business',
    '[{"name": "Zoho CRM", "type": "platform", "icon": "briefcase", "tier": "core"}, {"name": "Zia AI", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Blueprint Automation", "type": "concept", "icon": "chain", "tier": "core"}, {"name": "Sales Pipeline & Forecasting", "type": "concept", "icon": "chart", "tier": "core"}, {"name": "CRM Administration", "type": "concept", "icon": "database", "tier": "core"}]'::jsonb,
    'A 4-week, hands-on Zoho CRM certification track -- setup, lead management, pipeline analytics and automation -- for first-year MBA students.',
    'Part of the AIIT Bangalore MBA Certification Program. Participants configure a sandbox Zoho CRM organisation, manage leads and contacts with deduplication and workflow automation, build a live sales pipeline dashboard, then move into advanced automation with Zia AI features and Blueprint process automation. The course closes with a Zoho CRM certification mock exam and review. Zoho CRM certification eligibility is included; the official Zoho certification exam itself carries an additional fee charged directly by Zoho.',
    15000,
    NULL,
    'paid',
    'beginner_intermediate',
    24,
    '4 Weeks (12 Live Sessions, 2 Hours Each)',
    0, 0, 0,
    '{new_badge}',
    'ins-aiit',
    'horizon',
    ARRAY['Set up and configure a Zoho CRM organisation, including user roles and permissions','Capture and manage leads and contacts with clean, deduplicated data','Build workflow rules and basic automation for lead management','Build and read a live sales pipeline dashboard with deal stages and forecasting','Apply Zia AI features and Blueprint process automation','Use custom functions and basic Zoho CRM API concepts','Sit a Zoho CRM certification mock exam']::TEXT[],
    ARRAY['Basic computer literacy','First-year MBA student (or equivalent)','Access to a computer with internet connectivity']::TEXT[],
    ARRAY['First-year MBA students','Sales and CRM administration professionals']::TEXT[],
    ARRAY['Zoho CRM','Zia AI','Blueprint Automation']::TEXT[],
    'AIIT Certificate of Completion + Zoho CRM certification eligibility (an additional fee is charged by Zoho for the official certification) · PC or Mobile',
    'published',
    now()
);

INSERT INTO "courses" (
    "id", "slug", "title", "category_id", "domain_id", "catalogue_category",
    "technologies", "summary", "description", "price_usd_cents",
    "price_was_usd_cents", "pricing", "level", "duration_hours",
    "duration_label", "rating", "rating_count", "enrolled_count", "badges",
    "instructor_id", "image", "outcomes", "requirements", "audience",
    "tools_covered", "certification", "status", "published_at"
) VALUES (
    gen_random_uuid(),
    'strategic-lead-generation-and-growth-marketing',
    'Strategic Lead Generation & Growth Marketing',
    (SELECT id FROM "course_categories" WHERE name = 'Digital Marketing'),
    NULL,
    'digital-business-marketing',
    '[{"name": "LinkedIn Prospecting", "type": "platform", "icon": "megaphone", "tier": "core"}, {"name": "Google Ads", "type": "platform", "icon": "megaphone", "tier": "core"}, {"name": "Meta Ads", "type": "platform", "icon": "megaphone", "tier": "optional"}, {"name": "Zoho CRM", "type": "platform", "icon": "briefcase", "tier": "core"}, {"name": "Cold Email Sequencing", "type": "concept", "icon": "chatbubble", "tier": "core"}, {"name": "Lead Scoring", "type": "concept", "icon": "chart", "tier": "core"}]'::jsonb,
    'A 4-week, tool-based lead generation and growth marketing track -- funnels, channels, outbound and CRM integration -- for first-year MBA students.',
    'Part of the AIIT Bangalore MBA Certification Program. Participants build an ideal-customer-profile and buyer-persona worksheet, plan a multi-channel lead generation strategy across SEO, content, LinkedIn and paid ads, then run outbound campaigns -- cold email sequencing and LinkedIn outreach -- synced into Zoho CRM. The course closes with landing-page optimisation, A/B testing and lead scoring, and a capstone go-to-market plan.',
    15000,
    NULL,
    'paid',
    'beginner_intermediate',
    24,
    '4 Weeks (12 Live Sessions, 2 Hours Each)',
    0, 0, 0,
    '{new_badge}',
    'ins-aiit',
    'field',
    ARRAY['Define an ideal customer profile and buyer personas for a brand','Plan a multi-channel lead generation strategy across SEO, content, LinkedIn and paid ads','Run cold email sequencing and LinkedIn outreach cadences','Sync outbound leads into Zoho CRM','Apply landing-page optimisation and A/B testing basics','Score and prioritize leads by conversion likelihood','Produce a capstone go-to-market lead-generation plan']::TEXT[],
    ARRAY['Basic computer literacy','First-year MBA student (or equivalent)','Access to a computer with internet connectivity']::TEXT[],
    ARRAY['First-year MBA students','Marketing and growth professionals']::TEXT[],
    ARRAY['LinkedIn','Google Ads','Meta Ads','Zoho CRM']::TEXT[],
    'Certificate included · Certified by AIIT · PC or Mobile',
    'published',
    now()
);
