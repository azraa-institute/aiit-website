<div align="center">

# AIIT — Azraa Institute of Information Technology

**AIIT**, an international online technology institute —
[aiit.network](https://aiit.network) reimagined as a calm, editorial,
future-tech learning platform, with a real learner portal behind it.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

The site is built to **scale as a system**: adding a course, technology domain,
webinar, article, instructor or student story is a data change, never a
redesign.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | React 18 + TypeScript, bundled with Vite 5 |
| Routing | React Router 7 — lazy-loaded route chunks, classic declarative `<Routes>`, not the data-router/loader APIs |
| SEO | `react-helmet-async` — per-page metadata + JSON-LD; `sitemap.xml` generated at build time from real course/product/article data (see vite.config.ts) |
| Styling | Hand-built design system on CSS custom properties; no UI framework |
| Motion | CSS + `IntersectionObserver`, `prefers-reduced-motion` respected throughout |
| Content | Markdown blog + typed seed data; no CMS |
| Auth | Supabase Auth (email/password, magic link, TOTP 2FA); JWT verified against Supabase's JWKS |
| Backend | NestJS + Prisma + Postgres (Supabase), real business endpoints (see Backend below) |
| Hosting | Vercel (frontend, static SPA) + Render (API) |

## Quick start

```bash
npm install
npm run dev        # dev server → http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run typecheck  # tsc, no emit
```

Requires **Node 20+**.

This is an npm-workspaces monorepo: `apps/web` is the frontend above, `apps/api`
is the NestJS backend (real auth, catalogue, learner-portal endpoints — see
Backend below), `packages/shared` holds types shared by both.
`npm install`/`npm run dev`/`build`/`lint`/`typecheck` at the repo root operate
across the whole workspace; `npm run dev:api` starts the API alone.

## Project structure

```
azraa-aiit/
├── apps/web/        the frontend above (moved from the former repo-root src/)
├── apps/api/        the NestJS API — see Backend below
├── packages/shared/ TypeScript types imported by both apps
├── docs/            planning documents (local-only, gitignored)
└── scripts/         repo-level tooling (e.g. docs:pdf)
```

`apps/web/src/`:
```
src/
├── data/            content layer — typed shapes + seed data, decoupled from the UI
│   ├── types.ts        every content shape (Course, Webinar, Resource, …)
│   ├── courses.ts      course catalogue
│   ├── technologies.ts technology domains + course categories
│   ├── resources.ts    blog index (frontmatter parsed at build; bodies lazy-loaded)
│   └── …               webinars, testimonials, faqs, navigation, site, hero
├── content/posts/   the blog — one Markdown file per article
├── lib/             hooks + helpers (SEO, scroll reveal, countdown, Markdown renderer)
├── components/
│   ├── primitives/     Button, Section, Plate (procedural art)
│   ├── layout/         Header, Footer, MobileMenu, SiteSearch, AnnouncementBar
│   ├── common/         Field, NewsletterForm, Countdown, FloatingActions
│   ├── course/         CourseCard, CourseFilters
│   └── home/           homepage section components
├── pages/           one component per route
│   ├── auth/           login, register, forgot-password
│   └── portal/         learner portal — dashboard, courses, assignments, certificates, profile, settings
└── styles/          tokens.css (design system), reset, global rules
```

### Content layer

Presentation components consume the types in `src/data/types.ts` only. Swapping
in a CMS or an LMS API is a matter of replacing the modules in `src/data/` — the
UI does not change.

The **blog** is self-contained: `src/content/posts/*.md` (frontmatter + a
Markdown or HTML body) is the single source of truth. It is indexed at build
time and rendered by a small dependency-free renderer (`src/lib/markdown.ts`).
Adding an article is adding a file — see
[`src/content/README.md`](src/content/README.md).

### Imagery

`Plate` renders deterministic "editorial plates" — computational geometry seeded
per item, so there is no stock photography to license and nothing extra to load.
Pass a real image URL as a plate's `source` to swap it in without touching call
sites.

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | About, method, ecosystem, AIIT Blueprint |
| `/courses` · `/courses/:slug` | Course discovery (search / filter / sort) · course detail, including the payment-method picker for paid courses |
| `/resources` · `/resources/:slug` | AIIT Resources index · article |
| `/webinar` | Live at AIIT — featured webinar + events |
| `/faqs` | Help centre (searchable, categorised) |
| `/instructors` · `/why-join` · `/aiit-blueprint` | Editorial pages |
| `/affiliate` · `/affiliate-portal` | Public affiliate application (self-service account creation + e-signature) · the affiliate's own dashboard (referral link, registration count) |
| `/r/:slug` | Referral-link redirect — attributes a later signup to the affiliate, then sends the visitor on to `/` |
| `/shop` · `/shop/:slug` | Merchandise catalogue · product detail |
| `/contact` | Contact form |
| `/newsletter/confirm` · `/newsletter/unsubscribe` | Newsletter double opt-in confirm · unsubscribe (landed on from an email link) |
| `/verify/:credentialId` | Public certificate verification — no login required; shows a revoked credential's status plainly rather than a bare 404 |
| `/login` · `/register` · `/forgot-password` | Learner auth |
| `/staff/login` · `/staff/change-password` | Admin/instructor sign-in — deliberately unlinked from public nav, URL-only |
| `/change-password` | First-sign-in forced password change for any account issued a temporary one (staff created by an admin, or an affiliate's own server-created account) |
| `/portal` · `/portal/*` | Learner portal — dashboard, courses, live classes/schedule, certificates, assignments, practice quizzes, resources, webinars, support, profile, notifications, settings |
| `/classroom/:id` | The live classroom itself (LiveKit) — joined by whichever role (student/instructor/admin) the session belongs to |
| `/instructor` · `/instructor/*` | Instructor portal — dashboard, courses, roster, assignments + grading, quizzes, announcements, schedule |
| `/admin` · `/admin/*` | Admin portal — dashboard, students (incl. manual enroll/unenroll), instructors, admins, courses, timetables, classes, complaints, affiliates, announcements, payments, certificates (browse/revoke), reports, messages, audit log, settings |
| `/privacy-policy` · `/terms` | Legal |

## Deployment

**Frontend** (`apps/web`) — Vercel, auto-deploys `main` and every PR branch as a
preview. `vercel.json` configures SPA rewrites and asset caching. Any static
host works — serve `dist/` with a catch-all rewrite to `/index.html`. Vite
bakes `VITE_*` env vars in at **build time** — changing one in Vercel does
nothing until the next deploy.

**API** (`apps/api`) — Render, one production service. `.github/workflows/deploy.yml`
runs on every push to `main`: applies pending Prisma migrations against the
real database, then triggers a Render deploy via its deploy hook (Render only
tracks `main` — there is no preview environment for the API, so a PR branch's
Vercel preview still talks to the same production API). `CORS_ORIGINS` on
Render auto-allows any Vercel preview URL under this project via a pattern
match in `main.ts`, in addition to the two production domains listed there
explicitly.

## Backend

`apps/api` is a real NestJS + Prisma + Postgres (Supabase) backend, not a
scaffold. This is a genuinely large system at this point — three portals
(learner/instructor/admin), three live payment providers, a full WebRTC
classroom, and an affiliate program with its own e-signature flow all run on
it in production. Live modules:

- **Auth** — Supabase Auth (email/password, magic link, Google OAuth, TOTP
  2FA). API routes verify the caller's JWT against Supabase's JWKS endpoint
  (`JwtGuard`), then look up the app-level role from `profiles` — never
  trusts the JWT's own role claim. Staff (admin/instructor) accounts are
  created by an admin, not self-registered, and sign in separately at
  `/staff/login`. 2FA enrollment is self-service for every role (Supabase's
  MFA API is account-level, not role-gated — the staff sign-in flow already
  checked for it, it just had nowhere to enroll until staff settings grew
  the same section the learner portal already had). Account deletion is
  asymmetric by design: a learner can request their own (soft: a status flag
  plus a Supabase session ban, no purge job), but a staff account can only be
  deleted by an admin — every other staff-state change (suspend/reactivate)
  already works that way, and admin accounts themselves stay blocked from
  deletion through this UI the same way they're blocked from suspension.
- **Catalogue** — course/domain/category data, location-based currency
  pricing, curriculum tables (`CourseModule`/`Lesson`/`LessonResource`) exist
  in the schema but aren't wired to any UI yet — the learner experience today
  is entirely live-class + assignments + practice quizzes, not a self-paced
  lesson browser.
- **Payments** — three live, real-money providers, one provider-agnostic
  `Order` table (not a table per provider): **PayPal**, **Razorpay** (India/
  INR), **Paystack** (Nigeria/NGN). Each provider gets its own
  `apps/api/src/modules/payments/<provider>/` folder (a thin REST client, a
  checkout controller, a webhook controller); all three verify their webhook
  signatures before trusting any payload, and the charge amount is always
  resolved server-side from `Course.priceUsdCents`, never trusted from the
  client. Admin can browse/search paid orders (`/admin/payments`); there is
  no refund tooling yet (`refunded` is a tracked `OrderStatus`, but nothing
  calls a provider's refund API).
- **Live classroom** — LiveKit Cloud (WebRTC), not Zoom. Admins build
  timetables and auto-generate dated classes; instructors start/run a class
  (mute/remove, screen share with audio, end); learners join once it's live.
  Built out: mic-lock enforcement, a raise-hand queue, a real-time
  collaborative whiteboard, live reactions, pinned resources, quick-check
  polls, breakout rooms (instructor moderation currently reaches the main
  room only, not into breakout rooms), an instructor-reports-a-student flow,
  and attendance tracking with CSV/XLSX export. Session recording is not
  built yet — blocked on a storage-bucket (S3/R2-equivalent) decision for
  LiveKit's egress output.
- **Instructor portal** — course roster, assignments + grading (with signed,
  ownership-checked private file links for submissions), a practice-quiz
  authoring tool, course announcements — all scoped to the courses a given
  instructor is actually assigned to teach (`CourseInstructor`), enforced
  server-side on every route, not just hidden in the UI.
- **Admin portal** — dashboard, student directory (with manual course
  enroll/unenroll for cases self-service can't cover), instructor accounts,
  additional admin accounts, course/instructor assignment, timetables,
  classes, a complaints inbox, affiliate application review, announcements,
  payments/orders, a certificates browse-and-revoke view, attendance reports,
  an internal message inbox, and a full audit log (every suspend, reactivate,
  account creation, certificate revoke, and more, each with actor/target/
  reason/timestamp).
- **Affiliate program** — a public, no-session application form
  (`/affiliate`) that creates the account server-side with a one-time
  password (no password the applicant has to invent), a real e-signature
  flow on the Affiliate Agreement (typed full legal name + explicit consent
  checkbox, versioned agreement text, IP/timestamp captured), admin
  screening with approve/reject + reason, and a referral-link system
  (`/r/:slug`, 30-day last-click attribution) separate from the one-time
  login password. Commission: $5 per creator-introduced student, $7 per
  direct student referral (rising to $10 after 500 direct referrals).
- **Certificates** — `Enrollment`, `Assignment` + `AssignmentSubmission`,
  `Certificate`, `Notification`. Certificate issuance and grading are real
  `@Roles('admin')`/`@Roles('instructor')`-gated endpoints with real admin/
  instructor UI (not curl-only). Every certificate has a real,
  server-rendered PDF (`GET /me/certificates/:id/pdf`, `pdf-lib` — no
  headless browser) and a public, unauthenticated verification endpoint/page
  (`GET /certificates/verify/:credentialId`, `aiit.network/verify/:credentialId`)
  so anyone holding a credential ID can confirm it's real. The holder's name
  is snapshotted onto the certificate at issuance, not joined live from
  `Profile.name`, so a certificate keeps showing the name as it was on the
  day it was earned even if the learner renames themselves afterwards. An
  admin can revoke a certificate (refund, academic-integrity finding, a
  data-entry error) without deleting the row — the verify page then shows
  "revoked, as of &lt;date&gt;: &lt;reason&gt;" rather than a bare 404.
- **Profile** — `GET/PATCH /me`, `PATCH /me/preferences`, `DELETE /me` (soft
  deletion request, learner accounts only).
- **File storage** — avatar upload/remove and assignment file attachments via
  Supabase Storage (`avatars` public bucket, `submissions` private bucket),
  RLS-scoped to each user's own `{userId}/` path prefix. Both buckets also
  enforce `file_size_limit`/`allowed_mime_types` server-side (Supabase
  Storage itself, not just the browser-side check) — see the
  `storage_bucket_limits` migration.
- **Public forms** — contact, newsletter (double opt-in + unsubscribe),
  webinar registration, and affiliate application all store real data and
  send real email (Resend) once `TURNSTILE_SECRET_KEY`/`RESEND_API_KEY` are
  set. Cloudflare Turnstile gates all four; `TurnstileService` fails closed
  (refuses the request) rather than silently accepting unprotected
  submissions if the secret key isn't configured.
- **Error monitoring** — Sentry on both apps (`SENTRY_DSN` on the API,
  `VITE_SENTRY_DSN` on the frontend — the latter is statically eliminated
  from the built bundle entirely when unset, so there's no cost until it's
  configured). The frontend also uploads production source maps via
  `@sentry/vite-plugin` when `SENTRY_AUTH_TOKEN` is set, then deletes them
  locally so they're never served alongside the built JS.

**Security posture** — `helmet()` on the API (CSP/HSTS/frame-ancestors/etc.),
a matching CSP + security-header set on the web app (`vercel.json`), a global
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` blocking
mass-assignment, IP-keyed rate limiting via `@nestjs/throttler` (correct only
because the API trusts Render's single reverse-proxy hop explicitly —
`app.set('trust proxy', 1)`, not `true`, so a client can't spoof its own IP
via a forged `X-Forwarded-For`), and every webhook handler (PayPal/Razorpay/
Paystack/LiveKit) verifying signatures before trusting a payload.

**Not yet wired up:**

- **Apple sign-in** is not built — it needs a paid Apple Developer Program
  membership ($99/yr) and a separate setup (Services ID, private key, JWT
  client secret) that hasn't started; the button was removed rather than left
  showing a permanent "not configured" error. Google sign-in is real and
  configured (Google Cloud project `aiit-auth`, OAuth client, wired into
  Supabase).
- **Webinar registration** (the learner-facing `/portal/webinars` list) has
  no backend yet — `state.learner.webinars` is a hardcoded empty array, so
  the page always renders its honest empty state today. The UI code for a
  populated list already exists and needs no changes once a real backend is
  wired up.

---

<div align="center">
<sub>© Azraa Institute of Information Technology · Private and proprietary</sub>
</div>
