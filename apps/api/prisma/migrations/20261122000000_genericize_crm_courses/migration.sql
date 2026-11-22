-- De-Zoho-ifies the two MBA-program courses that named Zoho CRM specifically
-- (product decision: other CRMs can be used too, so the course shouldn't read
-- as Zoho-exclusive), and opens both courses up beyond "first-year MBA
-- students or professionals" to any learner. These rows were seeded by
-- 20261115000000_mba_certification_courses, already applied, so corrected
-- here rather than edited in place. seed-data/courses.ts carries the same
-- corrected content for a fresh local DB. Slugs and image paths are left
-- unchanged -- renaming either would break existing course-detail links and
-- the already-uploaded cover image, which isn't being re-uploaded here.

UPDATE "courses" SET
    title = 'CRM Professional Certification',
    technologies = '[
      {"name": "Zoho CRM", "type": "platform", "icon": "briefcase", "tier": "core"},
      {"name": "AI-Assisted CRM Insights", "type": "concept", "icon": "spark", "tier": "core"},
      {"name": "Visual Process Automation", "type": "concept", "icon": "chain", "tier": "core"},
      {"name": "Sales Pipeline & Forecasting", "type": "concept", "icon": "chart", "tier": "core"},
      {"name": "CRM Administration", "type": "concept", "icon": "database", "tier": "core"}
    ]'::jsonb,
    summary = 'A 4-week, hands-on CRM certification track covering setup, lead management, pipeline analytics and automation, with skills that transfer directly to any major CRM platform.',
    description = 'Participants configure a sandbox CRM organisation, manage leads and contacts with deduplication and workflow automation, build a live sales pipeline dashboard, then move into advanced automation with AI-assisted insights and visual process builders. Hands-on labs use Zoho CRM, but the concepts, workflows and administration skills covered apply directly to other major CRM platforms (HubSpot, Salesforce, Pipedrive and others) too. The course closes with a CRM certification mock exam and review. Optional Zoho CRM certification eligibility is included; the official Zoho certification exam itself carries an additional fee charged directly by Zoho.',
    outcomes = ARRAY[
      'Set up and configure a CRM organisation, including user roles and permissions',
      'Capture and manage leads and contacts with clean, deduplicated data',
      'Build workflow rules and basic automation for lead management',
      'Build and read a live sales pipeline dashboard with deal stages and forecasting',
      'Apply AI-assisted CRM features and visual process automation',
      'Use custom functions and basic CRM API concepts',
      'Sit a CRM certification mock exam'
    ],
    requirements = ARRAY['Basic computer literacy', 'Access to a computer with internet connectivity'],
    audience = ARRAY['Anyone wanting practical, hands-on CRM skills', 'Sales, marketing and CRM administration professionals'],
    tools_covered = ARRAY['Zoho CRM'],
    certification = 'AIIT Certificate of Completion + optional Zoho CRM certification eligibility (an additional fee is charged by Zoho for the official certification) · PC or Mobile'
WHERE "slug" = 'zoho-crm-professional-certification';

UPDATE "courses" SET
    technologies = '[
      {"name": "LinkedIn Prospecting", "type": "platform", "icon": "megaphone", "tier": "core"},
      {"name": "Google Ads", "type": "platform", "icon": "megaphone", "tier": "core"},
      {"name": "Meta Ads", "type": "platform", "icon": "megaphone", "tier": "optional"},
      {"name": "CRM Integration", "type": "concept", "icon": "briefcase", "tier": "core"},
      {"name": "Cold Email Sequencing", "type": "concept", "icon": "chatbubble", "tier": "core"},
      {"name": "Lead Scoring", "type": "concept", "icon": "chart", "tier": "core"}
    ]'::jsonb,
    summary = 'A 4-week, tool-based lead generation and growth marketing track covering funnels, channels, outbound and CRM integration.',
    description = 'Part of the AIIT Bangalore MBA Certification Program. Participants build an ideal-customer-profile and buyer-persona worksheet, plan a multi-channel lead generation strategy across SEO, content, LinkedIn and paid ads, then run outbound campaigns (cold email sequencing and LinkedIn outreach) synced into a CRM of their choice. The course closes with landing-page optimisation, A/B testing and lead scoring, and a capstone go-to-market plan.',
    outcomes = ARRAY[
      'Define an ideal customer profile and buyer personas for a brand',
      'Plan a multi-channel lead generation strategy across SEO, content, LinkedIn and paid ads',
      'Run cold email sequencing and LinkedIn outreach cadences',
      'Sync outbound leads into a CRM of your choice',
      'Apply landing-page optimisation and A/B testing basics',
      'Score and prioritize leads by conversion likelihood',
      'Produce a capstone go-to-market lead-generation plan'
    ],
    requirements = ARRAY['Basic computer literacy', 'Access to a computer with internet connectivity'],
    audience = ARRAY['Anyone wanting practical, hands-on lead-generation skills', 'Marketing and growth professionals'],
    tools_covered = ARRAY['LinkedIn', 'Google Ads', 'Meta Ads']
WHERE "slug" = 'strategic-lead-generation-and-growth-marketing';
