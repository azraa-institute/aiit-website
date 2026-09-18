-- Course catalogue taxonomy restructuring (2026-09-19).
-- See apps/api/prisma/schema.prisma's Course.catalogueCategory/technologies
-- doc comment for the design rationale. course_domains is intentionally
-- untouched throughout this migration -- the homepage "focus areas" rail,
-- its icons and Plate motif art all key off that table and stay exactly as
-- they were; only course_categories (the new "Subcategory") and courses (new "Category" + technologies + renamed/repriced/retimed content) change.

ALTER TABLE "courses" ADD COLUMN "catalogue_category" TEXT;
ALTER TABLE "courses" ADD COLUMN "technologies" JSONB NOT NULL DEFAULT '[]';

-- Subcategory renames (course_categories.name) -----------------------------
UPDATE "course_categories" SET name = 'Generative & Agentic AI' WHERE name = 'Artificial Intelligence';
UPDATE "course_categories" SET name = 'Edge Computing & IoT' WHERE name = 'Edge Computing';
UPDATE "course_categories" SET name = 'Blockchain & Web3 Fundamentals' WHERE name = 'Blockchain Technology';
UPDATE "course_categories" SET name = 'Digital & Technology Literacy' WHERE name = 'Digital & Tech Literacy';
UPDATE "course_categories" SET name = 'Networking' WHERE name = 'Networking & Cybersecurity';

-- New subcategories ---------------------------------------------------------
INSERT INTO "course_categories" (id, name, domain_id) VALUES (gen_random_uuid(), 'Cybersecurity', NULL);
INSERT INTO "course_categories" (id, name, domain_id) VALUES (gen_random_uuid(), 'Digital Marketing', NULL);
INSERT INTO "course_categories" (id, name, domain_id) VALUES (gen_random_uuid(), 'IT Business Management', NULL);

-- Re-point Ethical Hacking at the new, split-out "Cybersecurity" subcategory --
UPDATE "courses" SET category_id = (SELECT id FROM "course_categories" WHERE name = 'Cybersecurity') WHERE slug = 'ethical-hacking-and-cyber-security';

-- Courses --------------------------------------------------------------------
-- Generative AI & Large Language Models (LLMs)
UPDATE "courses" SET
    title = 'Generative AI & Large Language Models (LLMs)',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Generative & Agentic AI'),
    catalogue_category = 'artificial-intelligence-intelligent-systems',
    technologies = '[{"name": "OpenAI", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Claude", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Gemini", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Hugging Face", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "LangChain", "type": "framework", "icon": "chain", "tier": "core"}, {"name": "Prompt Engineering", "type": "concept", "icon": "chatbubble", "tier": "core"}, {"name": "RAG", "type": "concept", "icon": "search", "tier": "optional"}, {"name": "Embeddings", "type": "concept", "icon": "database", "tier": "optional"}, {"name": "Vector Databases", "type": "concept", "icon": "database", "tier": "optional"}]'::jsonb,
    level = 'intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)',
    price_usd_cents = 14000,
    price_was_usd_cents = NULL
WHERE slug = 'generative-ai-and-large-language-models-llms';

-- Agentic AI & Autonomous AI Systems (was: ai-engineering-associate-ai-engineer)
UPDATE "courses" SET
    slug = 'agentic-ai-and-autonomous-ai-systems',
    title = 'Agentic AI & Autonomous AI Systems',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Generative & Agentic AI'),
    catalogue_category = 'artificial-intelligence-intelligent-systems',
    technologies = '[{"name": "Claude", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "Gemini", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "OpenAI", "type": "platform", "icon": "spark", "tier": "core"}, {"name": "LangChain", "type": "framework", "icon": "chain", "tier": "core"}, {"name": "AI Agents", "type": "concept", "icon": "agents", "tier": "core"}, {"name": "Tool Calling", "type": "concept", "icon": "agents", "tier": "core"}, {"name": "Function Calling", "type": "concept", "icon": "agents", "tier": "core"}, {"name": "RAG", "type": "concept", "icon": "search", "tier": "core"}, {"name": "Agent Memory", "type": "concept", "icon": "agents", "tier": "core"}, {"name": "Multi-Agent Systems", "type": "concept", "icon": "agents", "tier": "core"}, {"name": "MCP", "type": "concept", "icon": "chain", "tier": "optional"}, {"name": "Agent orchestration frameworks", "type": "framework", "icon": "chain", "tier": "optional"}, {"name": "Vector Databases", "type": "concept", "icon": "database", "tier": "optional"}, {"name": "AI evaluation tools", "type": "tool", "icon": "search", "tier": "optional"}]'::jsonb,
    level = 'intermediate_advanced',
    duration_hours = 60,
    duration_label = '1 Month (60 Hours)',
    price_usd_cents = 18000,
    price_was_usd_cents = NULL,
    image = 'lattice',
    summary = 'Design, build and deploy autonomous AI agents that plan, use tools and work together -- going beyond prompting to real agentic systems.',
    description = 'This course moves beyond single-turn prompting into agentic AI: systems that reason, call tools, retrieve information and act autonomously toward a goal. Participants build real agents using Claude, Gemini and OpenAI APIs alongside LangChain, working hands-on with tool calling, function calling, Retrieval-Augmented Generation, agent memory and multi-agent coordination, and explore emerging ecosystems such as the Model Context Protocol (MCP).',
    outcomes = ARRAY['Design and build autonomous AI agents that plan, act and adapt toward a goal','Apply tool calling and function calling to connect AI models to real APIs and data','Implement Retrieval-Augmented Generation (RAG) for grounded, up-to-date responses','Give agents persistent memory across a conversation or task','Coordinate multiple agents working together on a shared objective','Work hands-on with Claude, Gemini and OpenAI APIs and the LangChain framework','Evaluate agent behaviour and catch failure modes before deployment','Apply the emerging Model Context Protocol (MCP) to connect agents to external tools']::TEXT[],
    requirements = ARRAY['Basic computer literacy','Familiarity with AI concepts (a Generative AI course or equivalent experience is recommended)','Basic programming knowledge, ideally Python','Access to a computer with internet connectivity']::TEXT[],
    audience = ARRAY['AI Engineers and developers moving from prompting to building agents','Software Developers adding AI agents to existing products','Data Scientists and Machine Learning Engineers','Technology Entrepreneurs building AI-native products','Researchers and students exploring agentic AI systems']::TEXT[],
    certification = 'Certificate included · Certified by AIIT · PC or Mobile'
WHERE slug = 'ai-engineering-associate-ai-engineer';

-- Data Science & Analytics
UPDATE "courses" SET
    title = 'Data Science & Analytics',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Data Analytics & Data Science'),
    catalogue_category = 'data-science-analytics',
    technologies = '[{"name": "Python", "type": "language", "icon": "code", "tier": "core"}, {"name": "Jupyter", "type": "tool", "icon": "chart", "tier": "core"}, {"name": "NumPy", "type": "library", "icon": "database", "tier": "core"}, {"name": "Pandas", "type": "library", "icon": "database", "tier": "core"}, {"name": "Matplotlib", "type": "library", "icon": "chart", "tier": "core"}, {"name": "Scikit-learn", "type": "library", "icon": "chart", "tier": "core"}, {"name": "SQL", "type": "language", "icon": "database", "tier": "core"}, {"name": "Data Visualization", "type": "concept", "icon": "chart", "tier": "core"}, {"name": "Statistical Analysis", "type": "concept", "icon": "chart", "tier": "core"}]'::jsonb,
    level = 'intermediate',
    duration_hours = 60,
    duration_label = '1 Month (60 Hours)'
WHERE slug = 'data-science-and-analytics';

-- Cloud Computing Fundamentals
UPDATE "courses" SET
    title = 'Cloud Computing Fundamentals',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Cloud Computing'),
    catalogue_category = 'cloud-computing-devops',
    technologies = '[{"name": "AWS", "type": "platform", "icon": "cloud", "tier": "core"}, {"name": "Microsoft Azure", "type": "platform", "icon": "cloud", "tier": "core"}, {"name": "Google Cloud", "type": "platform", "icon": "cloud", "tier": "core"}, {"name": "IaaS", "type": "concept", "icon": "cloud", "tier": "core"}, {"name": "PaaS", "type": "concept", "icon": "cloud", "tier": "core"}, {"name": "SaaS", "type": "concept", "icon": "cloud", "tier": "core"}, {"name": "Virtual Machines", "type": "concept", "icon": "cloud", "tier": "optional"}, {"name": "Cloud Storage", "type": "concept", "icon": "database", "tier": "optional"}, {"name": "Cloud Networking", "type": "concept", "icon": "network", "tier": "optional"}]'::jsonb,
    level = 'beginner_intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)'
WHERE slug = 'cloud-computing-fundamentals';

-- Cisco CCNA (Cisco Certified Network Associate)
UPDATE "courses" SET
    title = 'Cisco CCNA (Cisco Certified Network Associate)',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Networking'),
    catalogue_category = 'cybersecurity-networking',
    technologies = '[{"name": "Cisco", "type": "platform", "icon": "router", "tier": "core"}, {"name": "IPv4 / IPv6", "type": "concept", "icon": "network", "tier": "core"}, {"name": "Routing", "type": "concept", "icon": "network", "tier": "core"}, {"name": "Switching", "type": "concept", "icon": "network", "tier": "core"}, {"name": "VLANs", "type": "concept", "icon": "network", "tier": "core"}, {"name": "TCP/IP", "type": "concept", "icon": "network", "tier": "core"}, {"name": "Network Security", "type": "concept", "icon": "shield", "tier": "core"}, {"name": "Cisco Packet Tracer", "type": "tool", "icon": "router", "tier": "core"}]'::jsonb,
    level = 'beginner_intermediate',
    duration_hours = 60,
    duration_label = '1 Month (60 Hours)'
WHERE slug = 'cisco-ccna-cisco-certified-network-associate';

-- Ethical Hacking & Cybersecurity
UPDATE "courses" SET
    title = 'Ethical Hacking & Cybersecurity',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Cybersecurity'),
    catalogue_category = 'cybersecurity-networking',
    technologies = '[{"name": "Kali Linux", "type": "platform", "icon": "terminal", "tier": "core"}, {"name": "Wireshark", "type": "tool", "icon": "terminal", "tier": "core"}, {"name": "Nmap", "type": "tool", "icon": "terminal", "tier": "core"}, {"name": "Burp Suite", "type": "tool", "icon": "terminal", "tier": "core"}, {"name": "Metasploit", "type": "tool", "icon": "terminal", "tier": "core"}, {"name": "Linux", "type": "platform", "icon": "terminal", "tier": "core"}, {"name": "Network Security", "type": "concept", "icon": "shield", "tier": "core"}, {"name": "Web Security", "type": "concept", "icon": "shield", "tier": "core"}, {"name": "Vulnerability Assessment", "type": "concept", "icon": "search", "tier": "core"}]'::jsonb,
    level = 'intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)'
WHERE slug = 'ethical-hacking-and-cyber-security';

-- Edge Computing & IoT Systems (was: edge-computing)
UPDATE "courses" SET
    slug = 'edge-computing-and-iot-systems',
    title = 'Edge Computing & IoT Systems',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Edge Computing & IoT'),
    catalogue_category = 'emerging-advanced-computing',
    technologies = '[{"name": "IoT", "type": "concept", "icon": "chip", "tier": "core"}, {"name": "Edge Computing", "type": "concept", "icon": "chip", "tier": "core"}, {"name": "Raspberry Pi", "type": "platform", "icon": "chip", "tier": "core"}, {"name": "Arduino", "type": "platform", "icon": "chip", "tier": "core"}, {"name": "MQTT", "type": "protocol", "icon": "chip", "tier": "core"}, {"name": "Sensors", "type": "concept", "icon": "chip", "tier": "core"}, {"name": "Edge AI", "type": "concept", "icon": "spark", "tier": "optional"}, {"name": "Cloud–Edge Architecture", "type": "concept", "icon": "cloud", "tier": "optional"}, {"name": "Python", "type": "language", "icon": "code", "tier": "optional"}]'::jsonb,
    level = 'intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)',
    price_usd_cents = 18000,
    price_was_usd_cents = NULL
WHERE slug = 'edge-computing';

-- Quantum Computing Fundamentals
UPDATE "courses" SET
    title = 'Quantum Computing Fundamentals',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Quantum Computing'),
    catalogue_category = 'emerging-advanced-computing',
    technologies = '[{"name": "IBM Quantum", "type": "platform", "icon": "atom", "tier": "core"}, {"name": "Qiskit", "type": "framework", "icon": "atom", "tier": "core"}, {"name": "Quantum Circuits", "type": "concept", "icon": "atom", "tier": "core"}, {"name": "Quantum Algorithms", "type": "concept", "icon": "atom", "tier": "core"}, {"name": "Qubits", "type": "concept", "icon": "atom", "tier": "core"}, {"name": "Quantum Gates", "type": "concept", "icon": "atom", "tier": "core"}, {"name": "Quantum Simulation", "type": "concept", "icon": "atom", "tier": "optional"}]'::jsonb,
    level = 'beginner_intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)'
WHERE slug = 'quantum-computing-fundamentals';

-- Blockchain Technology & Web3 Fundamentals (was: blockchain-technology)
UPDATE "courses" SET
    slug = 'blockchain-technology-and-web3-fundamentals',
    title = 'Blockchain Technology & Web3 Fundamentals',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Blockchain & Web3 Fundamentals'),
    catalogue_category = 'blockchain-web3',
    technologies = '[{"name": "Ethereum", "type": "platform", "icon": "contract", "tier": "core"}, {"name": "Solidity", "type": "language", "icon": "code", "tier": "core"}, {"name": "Web3", "type": "concept", "icon": "globe", "tier": "core"}, {"name": "Smart Contracts", "type": "concept", "icon": "contract", "tier": "core"}, {"name": "Wallets", "type": "concept", "icon": "contract", "tier": "core"}, {"name": "Blockchain Networks", "type": "concept", "icon": "chain", "tier": "core"}, {"name": "Web3 APIs", "type": "concept", "icon": "chain", "tier": "optional"}]'::jsonb,
    level = 'intermediate',
    duration_hours = 40,
    duration_label = '1 Month (40 Hours)'
WHERE slug = 'blockchain-technology';

-- New course: Digital Marketing Fundamentals
INSERT INTO "courses" ("id", "slug", "title", "category_id", "domain_id", "catalogue_category", "technologies", "summary", "description", "price_usd_cents", "price_was_usd_cents", "pricing", "level", "duration_hours", "duration_label", "rating", "rating_count", "enrolled_count", "badges", "instructor_id", "image", "outcomes", "requirements", "audience", "tools_covered", "certification", "status", "published_at") VALUES (gen_random_uuid(), 'digital-marketing-fundamentals', 'Digital Marketing Fundamentals', (SELECT id FROM "course_categories" WHERE name = 'Digital Marketing'), NULL, 'digital-business-marketing', '[{"name": "Google Analytics", "type": "platform", "icon": "chart", "tier": "core"}, {"name": "Google Ads", "type": "platform", "icon": "megaphone", "tier": "core"}, {"name": "SEO", "type": "concept", "icon": "search", "tier": "core"}, {"name": "Social Media", "type": "concept", "icon": "megaphone", "tier": "core"}, {"name": "Content Marketing", "type": "concept", "icon": "megaphone", "tier": "core"}, {"name": "Email Marketing", "type": "concept", "icon": "megaphone", "tier": "core"}, {"name": "Digital Advertising", "type": "concept", "icon": "megaphone", "tier": "core"}, {"name": "Marketing Analytics", "type": "concept", "icon": "chart", "tier": "core"}, {"name": "Meta Ads / Meta Business Suite", "type": "platform", "icon": "megaphone", "tier": "optional"}]'::jsonb, 'A practical introduction to digital marketing -- SEO, paid advertising, social media, content and email marketing, and the analytics behind them.', 'This course introduces the core disciplines of digital marketing: search engine optimisation, paid advertising, social media, content and email marketing, and how to measure what is actually working. Participants learn to plan, run and analyse digital marketing activity using real platforms and a shared analytics vocabulary used across the industry.', 12000, NULL, 'paid', 'beginner', 40, '1 Month (40 Hours)', 0, 0, 0, '{}', 'ins-aiit', 'flow', ARRAY['Understand the core channels of digital marketing and how they work together','Apply on-page and off-page SEO fundamentals','Plan and run paid campaigns on Google Ads and social platforms','Build a content marketing plan aligned to a target audience','Run an email marketing campaign from list to send','Read and interpret Google Analytics reports','Measure campaign performance with core marketing analytics metrics','Apply ethical, permission-based marketing practices']::TEXT[], ARRAY['Basic computer literacy','Familiarity with using the internet and social media','No prior marketing experience required','Access to a computer with internet connectivity']::TEXT[], ARRAY['Aspiring digital marketers','Small business owners and entrepreneurs','Content creators and social media managers','Sales and business development professionals','Students pursuing marketing or business careers']::TEXT[], '{}', 'Certificate included · Certified by AIIT · PC or Mobile', 'published', now());

-- New course: IT Business Management Fundamentals
INSERT INTO "courses" ("id", "slug", "title", "category_id", "domain_id", "catalogue_category", "technologies", "summary", "description", "price_usd_cents", "price_was_usd_cents", "pricing", "level", "duration_hours", "duration_label", "rating", "rating_count", "enrolled_count", "badges", "instructor_id", "image", "outcomes", "requirements", "audience", "tools_covered", "certification", "status", "published_at") VALUES (gen_random_uuid(), 'it-business-management-fundamentals', 'IT Business Management Fundamentals', (SELECT id FROM "course_categories" WHERE name = 'IT Business Management'), NULL, 'technology-management-business', '[{"name": "IT Governance", "type": "concept", "icon": "briefcase", "tier": "core"}, {"name": "IT Service Management", "type": "concept", "icon": "briefcase", "tier": "core"}, {"name": "Digital Transformation", "type": "concept", "icon": "briefcase", "tier": "core"}, {"name": "Technology Strategy", "type": "concept", "icon": "briefcase", "tier": "core"}, {"name": "Project Management", "type": "concept", "icon": "briefcase", "tier": "core"}, {"name": "Business Analysis", "type": "concept", "icon": "search", "tier": "core"}, {"name": "IT Risk Management", "type": "concept", "icon": "shield", "tier": "core"}, {"name": "Technology KPIs", "type": "concept", "icon": "chart", "tier": "core"}, {"name": "Agile", "type": "concept", "icon": "briefcase", "tier": "optional"}, {"name": "Scrum", "type": "concept", "icon": "briefcase", "tier": "optional"}]'::jsonb, 'A technology-focused introduction to IT business management -- governance, service management, project delivery and digital transformation for IT-driven organisations.', 'This course introduces IT business management as it is practised inside technology-driven organisations: governance, IT service management, project and risk management, and the strategic thinking behind digital transformation. It is built for people working at the intersection of technology and business, not a general management or MBA-style programme.', 12000, NULL, 'paid', 'beginner_intermediate', 40, '1 Month (40 Hours)', 0, 0, 0, '{}', 'ins-aiit', 'mesh', ARRAY['Understand core IT governance and IT service management frameworks','Apply project management fundamentals to technology initiatives','Identify and manage common IT risks','Read and use technology KPIs to support decisions','Understand the drivers and stages of digital transformation','Apply Agile and Scrum fundamentals to technology delivery','Communicate technology strategy to non-technical stakeholders','Conduct basic business analysis for a technology initiative']::TEXT[], ARRAY['Basic computer literacy','Interest in how technology teams and IT-driven businesses operate','No prior management experience required','Access to a computer with internet connectivity']::TEXT[], ARRAY['IT professionals moving toward leadership or management','Project coordinators and business analysts in technology teams','Technology entrepreneurs and startup founders','Students pursuing technology management or IT careers']::TEXT[], '{}', 'Certificate included · Certified by AIIT · PC or Mobile', 'published', now());

-- Digital & Tech Literacy (was: digital-and-tech-literacy-absolute-beginner)
UPDATE "courses" SET
    slug = 'digital-and-tech-literacy',
    title = 'Digital & Tech Literacy',
    category_id = (SELECT id FROM "course_categories" WHERE name = 'Digital & Technology Literacy'),
    catalogue_category = 'foundation-digital-literacy',
    technologies = '[{"name": "Computer Fundamentals", "type": "concept", "icon": "monitor", "tier": "core"}, {"name": "Internet & Web", "type": "concept", "icon": "globe", "tier": "core"}, {"name": "Digital Communication", "type": "concept", "icon": "chatbubble", "tier": "core"}, {"name": "Online Safety", "type": "concept", "icon": "shield", "tier": "core"}, {"name": "Productivity Tools", "type": "concept", "icon": "monitor", "tier": "core"}, {"name": "Digital Collaboration", "type": "concept", "icon": "chatbubble", "tier": "core"}, {"name": "Basic AI Awareness", "type": "concept", "icon": "spark", "tier": "core"}]'::jsonb,
    level = 'absolute_beginner',
    duration_hours = 0,
    duration_label = '1 Month (3 Lectures)'
WHERE slug = 'digital-and-tech-literacy-absolute-beginner';

-- catalogue_category is deliberately left nullable rather than backfilled +
-- NOT NULL-enforced here: every course this migration knows about (the 10
-- originally seeded via prisma/seed-data + the 2 new ones inserted above)
-- gets a real value, but there is no reliable way from this migration alone
-- to prove that is *every* row -- a draft or soft-deleted course created
-- outside the seed script would be missed, and enforcing NOT NULL against
-- an unknown row would fail the whole deploy. CoursesService's mapper
-- (mapCatalogueCategory) already falls back to a generic "Technology" label
-- for a null/unrecognised value, same as the pre-existing CourseDomain
-- fallback it replaces.