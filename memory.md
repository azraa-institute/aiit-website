# AIIT Platform — Project Memory

**This is the authoritative project handover document.** Read this before planning or
modifying code in a new session. It is written to be self-contained — a session should
not need prior conversation history to resume work correctly. Verify specific claims
against the current source when precision matters (file contents change; this document
is updated on a best-effort basis, see §15 for when it was last touched).

Audited and written: **2026-10-13**, against commit `ec6db33` on `main`
(`git log --oneline -1` to confirm current HEAD). Working tree was clean at audit time.

---

## 1. Project identity and overview

**AIIT** (Azraa Institute of Information Technology) — an international online
technology-education platform. Public marketing/discovery site at
[aiit.network](https://aiit.network), plus a real, logged-in product behind it: a
learner portal, an instructor portal, an admin back-office, and a public affiliate
program, all backed by a real NestJS/Postgres API (not a prototype — see §5 for what's
actually wired up end-to-end vs. stubbed).

**Target users:** three distinct audiences with separate sign-in paths —
(1) prospective/enrolled learners (public site + `/portal`, self-registered), (2)
instructors and admins (`/instructor`, `/admin` — staff accounts, created by an admin,
sign in at `/staff/login`, never self-registered), (3) affiliates (`/affiliate` public
application form → `/affiliate-portal`, a server-created one-time-password account, not
self-registered either).

**Core value proposition:** practical, real-world tech skills (AI, data science, cloud,
cybersecurity, networking, software development, Web3, etc.) via live instructor-led
classes (not pre-recorded video), real assignments with grading, verifiable
certificates, and project-based outcomes — not a self-paced video-course catalogue (see
the Catalogue note in §5: curriculum/lesson tables exist in the schema but the learner
experience today is entirely live-class + assignments + quizzes).

**Main user journeys:**
- Visitor discovers a course (`/courses` → `/courses/:slug`) → asks Quill (the
  course-advisor chat assistant) questions → enrolls (free, or pays via
  PayPal/Razorpay/Paystack) → signs up/in.
- Learner completes a profile-completion wizard (required before most of `/portal`
  unlocks, see `RequireCompleteProfile`) → attends live classes (LiveKit video) on a
  timetable → submits assignments → earns a verifiable certificate
  (`/verify/:credentialId`, public, no login).
- Instructor runs a live class (mute/remove participants, screen share, whiteboard,
  polls, breakout rooms), grades submissions, posts announcements — all scoped
  server-side to courses they're actually assigned to teach.
- Admin manages everything: accounts, courses, timetables, payments, certificates
  (including revocation), affiliate applications, complaints, and a full audit log.
- A creator/affiliate applies at `/affiliate`, gets a referral link (`/r/:slug`,
  30-day last-click attribution), earns commission per referred student.

**Current development stage:** actively developed, in production, not a prototype.
Three portals, three live payment providers, a full WebRTC classroom, and an affiliate
e-signature flow all run in production today. Development has been solo and iterative
(see the staleness notice in `docs/README.md` — the original two-engineer phased plan
in `docs/backend-implementation-plan.pdf` describes a roadmap that was **not** how the
system was actually built; it's historical, not descriptive of the current system).

**Relevant project-wide constraints:**
- No CMS — content (courses, blog, FAQs) is typed seed data / Markdown files, by
  design (`src/data/` is meant to be swappable for a real CMS/LMS API later without
  touching UI code).
- Public, unauthenticated endpoints (Quill chat, public forms) are deliberately
  rate-limited and Turnstile-gated against abuse.
- Every webhook handler (PayPal/Razorpay/Paystack/LiveKit) verifies its signature
  before trusting a payload — no exceptions.
- A client-supplied amount, role claim, or storage key is **never** trusted — always
  re-resolved/derived server-side (price from `Course.priceUsdCents`, role from
  `profiles` not the JWT, file storage keys from the authenticated user's own ID).

---

## 2. Technology stack

| Area | Choice | Version (verified) |
|---|---|---|
| Frontend framework | React + TypeScript, Vite | React `18.3.1`, TS `5.6.3`, Vite `5.4.11` |
| Routing | React Router | `7.18.4` — classic declarative `<Routes>`, not the data-router/loader APIs |
| Backend framework | NestJS | `@nestjs/core 10.4.22` |
| ORM / DB | Prisma + PostgreSQL (Supabase) | Prisma `5.22.0`, `@prisma/client 5.22.0` |
| Auth | Supabase Auth (email/password, magic link, Google OAuth, TOTP 2FA) | JWT verified against Supabase JWKS |
| Rate limiting | `@nestjs/throttler` | `5.2.0` |
| Security headers | `helmet` (API) + matching CSP in `vercel.json` (web) | `helmet 8.3.0` |
| Validation | `class-validator` | `0.14.4`, global `ValidationPipe({whitelist:true, forbidNonWhitelisted:true})` |
| File uploads | `multer` (NestJS `FileInterceptor`, `memoryStorage`) | `2.0.2` |
| PDF generation | `pdf-lib` (certificates, affiliate agreement) — no headless browser | `1.17.1` |
| Live video | LiveKit Cloud (WebRTC), not Zoom | `livekit-server-sdk` |
| Payments | PayPal, Razorpay (India/INR), Paystack (Nigeria/NGN) — thin REST clients, no SDKs for the latter two | — |
| Email | Resend (transactional + newsletter) | — |
| Anti-abuse | Cloudflare Turnstile (`TurnstileService`, fails closed if unconfigured) | — |
| Error monitoring | Sentry (both apps; frontend DSN statically eliminated from the bundle when unset) | `@sentry/vite-plugin` |
| Styling | Hand-built design system on CSS custom properties — no UI framework (no Tailwind/MUI/etc.) | — |
| Content | Markdown blog (`apps/web/src/content/posts/*.md`) + typed seed data — no CMS | — |
| Testing (API) | Jest (`npm run test`, `npm run test:e2e`) — **60 spec files**, all passing as of last run this session | — |
| Testing (web) | **None** — no `test` script in `apps/web/package.json`, zero `*.test.ts(x)`/`*.spec.ts(x)` files found | — |
| Hosting | Vercel (`apps/web`, static SPA, auto-deploys `main` + PR previews) + Render (`apps/api`, one production service, no preview envs) | — |
| CI/CD | GitHub Actions — `.github/workflows/ci.yml` (lint/typecheck/test/migrate/build on every push+PR) and `deploy.yml` (migrate prod DB + trigger Render deploy on push to `main`) | — |

**Monorepo:** npm workspaces — `apps/web`, `apps/api`, `packages/shared` (TS types
imported by both; `"@aiit/shared": "*"` in `apps/api/package.json`).

---

## 3. Project architecture and directory map

```
azraa-aiit/
├── apps/web/            React SPA — see below
├── apps/api/             NestJS API — see below
├── packages/shared/src/  Types shared by both apps (one .ts file per domain:
│                         auth, catalogue, payment, live-class, affiliate, quill, …)
├── docs/                 Planning docs — backend-implementation-plan (historical,
│                         see staleness notice), production-readiness.html/pdf
│                         (frontend/content/launch checklist — STALE, see §12),
│                         infrastructure-setup-and-workflow, email-templates
├── scripts/               build-docs-pdf.mjs (docs:pdf script)
├── design-sources/        raw design assets (auth, brand, course-covers)
└── .github/workflows/     ci.yml, deploy.yml
```

### `apps/web/src/` (99 page files, 71 component files)

```
src/
├── App.tsx              Route tree — single source of truth for all routing (see §4)
├── data/                 Content layer: typed shapes (types.ts) + seed data
│                         (courses, faqs, technologies, resources index, …) —
│                         swappable for a CMS/LMS API without touching UI
├── content/posts/        The blog — one Markdown file per article, indexed at
│                         build time (vite.config.ts virtual module), rendered by
│                         a dependency-free renderer (lib/markdown.ts)
├── lib/                   Hooks, API client (api.ts/apiFetch), auth context,
│                         Quill chat client + history (quillChat.ts, quillHistory.ts,
│                         QuillContext.tsx), Supabase client, SEO helper
├── components/
│   ├── primitives/        Button, Section, Plate (procedural deterministic art —
│   │                      no stock photography)
│   ├── layout/             Header, Footer, Layout (wraps every public page — see
│   │                      important note in §11), FloatingActions (back-to-top +
│   │                      WhatsApp + Quill launcher), MobileMenu, SiteSearch
│   ├── common/             Field, NewsletterForm, EnrollmentPopup, CookieConsent
│   ├── course/              CourseCard, CourseFilters, QuillChatPanel, QuillAvatar
│   └── auth/                RequireAuth, RequireRole, RequireCompleteProfile,
│                            RequireAffiliate — route guards, see §4
├── pages/
│   ├── auth/               Login/Register/ForgotPassword/StaffLogin/etc.
│   ├── portal/              Learner portal — dashboard, courses, assignments,
│   │                        certificates, profile, settings, live classroom
│   ├── instructor/          Instructor portal
│   ├── admin/                Admin portal
│   └── affiliate/            Affiliate portal — Dashboard/Link/Payout/Settings pages
└── styles/tokens.css       Design system — see §7
```

### `apps/api/src/` (17 modules, 41 controllers, 41 services, 60 spec files)

```
src/
├── main.ts                 Bootstrap — helmet, CORS (incl. Vercel-preview pattern
│                           match), Sentry, Swagger (gated by SWAGGER_ENABLED),
│                           trust-proxy=1 (exactly one hop — Render's own proxy;
│                           this is what makes IP-keyed rate limiting trustworthy)
├── app.module.ts            Root module — throttler config, logger level
├── common/                  Shared guards (JwtGuard), decorators (@CurrentUser,
│                           @Roles), Prisma service, Supabase admin client
│                           (service-role — see §11's avatar-upload note),
│                           currency resolution, memory cache
├── modules/                  One folder per domain (see full list in §5) — each
│                           typically: *.controller.ts, *.service.ts, dto/,
│                           *.spec.ts. Consistent pattern across all 17 modules.
└── prisma/
    ├── schema.prisma         34 models, 17 enums — see §6
    └── migrations/            49 timestamped folders, 2026-09-10 → 2026-10-10
```

### `packages/shared/src/`

One `.ts` file per domain (`auth.ts`, `catalogue.ts`, `payment.ts`, `live-class.ts`,
`affiliate.ts`, `quill.ts`, `admin.ts`, `assignment.ts`, `certificate.ts`,
`enrollment.ts`, `geo.ts`, `instructor.ts`, `notification.ts`, `practice.ts`,
`support.ts`, `api.ts`) — the request/response contract both apps compile against.
Changing a shape here is the first step for any cross-stack feature change.

---

## 4. Website pages and routing

Full route tree lives in `apps/web/src/App.tsx` (single file, ~377 lines, lazy-loaded
chunks per page). Verified by direct read; organized here by area. "Guard" = the route
wrapper chain from `apps/web/src/components/auth/`.

### Public site (no guard)
`/` Home · `/about` · `/courses` · `/courses/:slug` (course detail — includes the
payment-method picker, and the Quill "Ask about this course" entry point) · `/resources`
· `/resources/:slug` · `/webinar` · `/faqs` · `/contact` · `/newsletter/confirm` ·
`/newsletter/unsubscribe` · `/verify/:credentialId` (public certificate verification) ·
`/shop` · `/shop/:slug` (plus one legacy-slug redirect) · `/instructors` (route/page
still live, **nav entry hidden** 2026-10-15 at the project owner's request — see §15;
only reachable by direct URL now) · `/why-join`
· `/aiit-blueprint` · `/affiliate` (public application form) · `/r/:slug` (referral
redirect → `/register`, changed 2026-10-14 from `/` so the click is visibly attributed
on the registration page, not just silently stored — see §15) · `/privacy-policy` ·
`/terms` · `*` → `NotFoundPage`.

### Auth
`/login` · `/register` · `/forgot-password` · `/auth/callback` · `/reset-password` ·
`/change-password` `[RequireAuth]` · `/staff/login` · `/staff/change-password`
`[RequireAuth(staff) → RequireRole(admin|instructor, allowMustChangePassword)]`.

### Learner portal — `/portal/*`
Wrapper: `RequireAuth → RequireRole(learner) → PortalLayout`. Most sub-routes also
require `RequireCompleteProfile` (profile-wizard must be finished) — **exceptions**:
`/portal` (dashboard), `/portal/support`, `/portal/profile`, `/portal/notifications`,
`/portal/settings` don't require a complete profile (deliberate, so the profile can
actually be completed and support/settings stay reachable regardless).

Sub-routes: `(index)` Dashboard · `courses` MyCourses · `courses/:slug`
CourseWorkspace · `certificates` · `assignments` · `practice` (quizzes) · `resources`
· `webinars` (UI exists, **no backend** — see §9) · `schedule` · `support` ·
`profile` · `notifications` · `settings` · `classes/:id` (legacy redirect →
`/classroom/:id`).

### Live classroom
`/classroom/:id` — `[RequireAuth]` only (no role restriction — open to
learner/instructor/admin, whichever the session belongs to). Full-screen, **not**
nested under `PortalLayout`.

### Instructor portal — `/instructor/*`
Wrapper: `RequireAuth(staff) → RequireRole(instructor) → InstructorLayout`.
`(index)` Dashboard · `classes` (reuses the learner portal's `SchedulePage` component)
· `courses` · `courses/:courseId` · `assignments/:id` · `grading` · `complaints` ·
`settings`.

### Admin portal — `/admin/*`
Wrapper: `RequireAuth(staff) → RequireRole(admin) → AdminLayout`. Code comment on the
guard: *"RequireRole is UX only — every `/admin` API endpoint enforces the admin role
itself."* `(index)` Dashboard · `students` · `instructors` · `admins` · `certificates`
· `courses` · `timetables` · `classes` · `complaints` · `affiliates` ·
`announcements` · `payments` · `reports` · `messages` · `audit` · `settings` ·
`blog` / `blog/new` / `blog/:id` (new 2026-10-14 — see §5's Blog row).

### Affiliate — `/affiliate*`
`/affiliate` (public, no guard) · `/affiliate-portal` `[RequireAuth → RequireAffiliate
→ AffiliateLayout]` — `RequireAffiliate` gates on *having an Affiliate record at
all* (not role, not approval status); redirects to `/change-password` if a password
change is required, or back to `/affiliate` if the account has no application on file.
Split into 4 pages 2026-10-14 (was one page): `(index)` Dashboard (status/stepper,
stats row, agreement download, quick-link cards into the two below) ·
`link` (`AffiliateLinkPage.tsx`, the referral-link reveal box) ·
`payout` (`AffiliatePayoutPage.tsx`, region-aware PayPal/bank form — India (IFSC) /
Nigeria (NUBAN + bank-name dropdown) / generic-other, masked account number with a
show/hide toggle, confirm-before-overwrite on an existing saved method, own payout
history) · `settings` (`AffiliateSettingsPage.tsx`, change password + edit the
contact/context fields given at application time via `PUT /affiliates/me/contact`).

### Portal data dependency
The whole learner-portal shell hangs off one hook, `useLearner()` in
`apps/web/src/pages/portal/learnerData.ts`, which fetches in parallel:
`GET /auth/me`, `GET /me/enrollments`, `GET /me/assignments`, `GET /me/certificates`,
`GET /me/notifications`. Result is memoized module-level and shared across every
mounted `useLearner()` instance; `invalidateLearner()` broadcasts a refetch to all of
them. **Important behavior** (fixed this session, see §13): a refetch does **not**
reset `status` to `'loading'` — it's stale-while-revalidate, so pages don't blank out
behind a full-page spinner just because something elsewhere triggered a refetch.

---

## 5. Feature implementation registry

Status key: ✅ complete & verified · 🟡 complete, not independently re-verified this
session · ⚠️ partial/known gap · ❌ not built.

| Feature | Status | Key files | Notes |
|---|---|---|---|
| **Auth** (email/password, magic link, Google OAuth, TOTP 2FA) | 🟡 | `apps/api/src/modules/auth/` | JWT verified against Supabase JWKS (`JwtGuard`); app role always read from `profiles`, never trusted from the JWT claim. Apple sign-in **not built** (needs paid Apple Developer account — see §9). **Staff onboarding fixed this session** (2026-10-14, uncommitted — see §11): new instructor/admin accounts and password resets now actually email the temporary credentials (`AdminUsersService.sendCredentialsEmail`, reusing `EmailService`/`brandedEmailHtml`) instead of relying on the admin to copy/paste them; `StaffChangePasswordPage` now force-signs-out and redirects to `/staff/login` after a password change instead of carrying the temp-password session straight into the portal; the "Student sign-in" link was removed from `/staff/login` (`AuthLayout`'s `footer` prop is now optional). |
| **Catalogue / course discovery** | 🟡 | `apps/api/src/modules/courses/` | Location-based currency pricing. Curriculum tables (`CourseModule`/`Lesson`/`LessonResource`) exist in schema and are soft-deletable, but **seeded empty, not wired to any learner UI** — the real learner experience is live-class + assignments + quizzes, not a self-paced lesson browser. |
| **Quill** (AI course-advisor chat assistant) | ✅ verified live this session | `apps/api/src/modules/quill/`, `apps/web/src/components/course/QuillChatPanel.tsx`, `apps/web/src/lib/QuillContext.tsx`, `quillHistory.ts` | **Just promoted to site-wide** (2026-10-11, commit `ec6db33`) — a persistent floating launcher button on every public page (not just the course page), with client-side (localStorage) multi-conversation history and a "New chat" action. `courseSlug` is now optional on the request; absent → general-assistant mode answering from the live course catalogue + a small curated fact file. Rule-based today (no LLM call); `XAI_API_KEY` is the documented seam to plug in a real model (x.ai Grok) later without changing the contract. **README.md's "Backend" section describing Quill is now stale** — still describes it as course-page-only; not yet updated to reflect the site-wide launcher/history work (see §9, §12). |
| **Payments** (PayPal, Razorpay, Paystack) | 🟡 | `apps/api/src/modules/payments/{paypal,razorpay,paystack}/` | One provider-agnostic `Order` table. Every webhook verifies its signature. Charge amount always resolved server-side from `Course.priceUsdCents`, never trusted from the client. **No refund tooling** — `refunded` is a tracked `OrderStatus` but nothing calls a provider's refund API. Whether each provider is on Live vs. Test credentials in the actual deployed env is **not verifiable from code** — check Render's env vars directly if this matters. |
| **Live classroom** (LiveKit) | 🟡 | `apps/api/src/modules/live-classes/`, `apps/web/src/pages/portal/LiveClassroomPage.tsx`, `apps/web/src/components/classroom/` | Mic-lock, raise-hand queue, real-time whiteboard, live reactions, pinned resources, polls, breakout rooms, instructor-reports-student flow, attendance tracking + CSV/XLSX export. **Gaps:** session recording still not built — the storage-bucket decision this was blocked on is now resolved (Cloudflare R2 is live, see the new R2 row below), but no LiveKit Egress API wiring/`Recording` model exists yet, so this is now a scoped build task, not a decision-blocked one; breakout-room instructor moderation currently reaches the main room only, not into individual breakout rooms. |
| **Instructor portal** | 🟡 | `apps/api/src/modules/instructor/`, `apps/web/src/pages/instructor/` | Roster, grading (signed, ownership-checked private submission file links), practice-quiz authoring, announcements — all scoped server-side to `CourseInstructor` assignments, not just hidden in the UI. |
| **Admin portal** | 🟡 | `apps/api/src/modules/admin/`, `apps/web/src/pages/admin/` | Student directory w/ manual enroll/unenroll, staff account management, course/instructor assignment, timetables, classes, complaints inbox, affiliate screening, announcements, payments/orders browse, certificate browse+revoke, attendance reports, internal messages, full audit log. **2026-10-15:** Students list/detail and Affiliates detail now cross-link each other (an affiliate is *never* a separate role — see the Affiliate program row below — so this was previously invisible); `GET /admin/students` also gained `includeAffiliates` (default false), which hides an affiliate-only account (never enrolled in anything) from the default Students view — an affiliate who *has* enrolled always still shows. `GET /admin/affiliates` gained a `q` (name/email) search param it never had, needed to make the cross-link's deep-link actually useful. |
| **Affiliate program** | ✅ verified live this session | `apps/api/src/modules/affiliates/`, `apps/web/src/pages/AffiliatePage.tsx`, `apps/web/src/pages/affiliate/` | Public no-session application (server-creates the account with a one-time password), real e-signature flow (typed legal name + consent checkbox + versioned agreement text + IP/timestamp), admin approve/reject + reason, referral-link attribution (`/r/:slug` → `/register`, 30-day last-click, changed 2026-10-14 to show a visible "Referral applied: ⟨slug⟩" banner on `RegisterPage.tsx` instead of silently storing it). Commission: $5/creator-introduced student, $7/direct referral (→$10 after 500 direct referrals), `null` (count-only, no rate) for the undocumented affiliate-to-affiliate type — computed server-side once via `computeEarnings()`, shared by both the affiliate's own view and the admin view so the numbers can't drift. Manual-payout ledger (Phase 1, no live payout API): affiliate sets PayPal email or bank details (`PUT /affiliates/me/payout`, tightly throttled + IP-audited), admin pays by hand and records it (`POST /admin/affiliates/:id/payouts`), both sides see the same `AffiliatePayout` history. Affiliate can also self-edit the contact/context fields given at application time (`PUT /affiliates/me/contact`). **Portal split into 4 pages 2026-10-14** (Dashboard/Link/Payout/Settings — see §4) with a region-aware (India/Nigeria/generic) bank-transfer form, masked account number, and a confirm-before-overwrite step on an existing payout method. **2026-10-15 investigation (not a bug, confirmed):** the project owner flagged an affiliate's email showing up under admin Students as "overlap" — traced end to end and confirmed this is the deliberate, documented architecture (`Role` enum has no `affiliate` value; affiliate-ness is tracked purely by whether an `Affiliate` row exists for a `Profile`, never by role — see the schema comment on the `Affiliate` model and `AffiliatesService`'s own doc comment). No duplicate-account path exists either: `SupabaseAdminService.createUser()` surfaces Supabase's own "already registered" error as a clean `ConflictException` rather than ever creating a second account for one email. The real gap was the admin UI having zero visibility into this — fixed, see the Admin portal row above. |
| **Certificates** | 🟡 | `apps/api/src/modules/certificates/` | Real server-rendered PDF (`pdf-lib`, no headless browser), public verification page/endpoint. Holder name **snapshotted at issuance** (`Certificate.holderName`), not joined live — stays accurate even if the learner later renames themselves. Admin can revoke without deleting the row (`revokedAt`/`revokedReason`); verify page shows "revoked, as of ⟨date⟩: ⟨reason⟩" instead of a bare 404. |
| **Profile / avatar / assignment file uploads** | ✅ verified live this session | `apps/api/src/common/supabase-admin/supabase-admin.service.ts`, `apps/api/src/modules/auth/profile.{controller,service}.ts`, `apps/api/src/modules/assignments/`, `apps/web/src/pages/portal/ProfilePage.tsx`, `apps/web/src/pages/portal/AssignmentRow.tsx` | **Architecture changed this session** (2026-10-10/11, commits `854752c`+): uploads now go browser → NestJS API (multipart, `JwtGuard`-authenticated) → Supabase Storage via the service-role admin client — **not** direct browser-to-Storage. Root cause: Supabase Storage's RLS evaluation was failing to bridge the request JWT into the Postgres session context for this project (confirmed via extensive live debugging — a platform-level issue, not fixable from app code or migrations). Upload key is always derived server-side from the authenticated user's ID, never from client input — this is what replaces RLS's per-user isolation guarantee. `publicFileUrl()` (unauthenticated public-bucket read, for *displaying* an avatar) is unaffected and still goes direct to Storage. The since-unused `uploadFile()`/`removeFile()` in `apps/web/src/lib/storage.ts` were deleted 2026-10-13 (`publicFileUrl()` is now the file's only export). |
| **Public forms** (contact, newsletter, webinar reg, affiliate application) | 🟡 | `apps/api/src/modules/forms/` (4 submodules) | All Turnstile-gated (`TurnstileService` fails **closed** if `TURNSTILE_SECRET_KEY` unset — refuses the request rather than silently accepting unprotected submissions), all send real email via Resend once `RESEND_API_KEY` set (fails **open** if unset — submission still saves, email just doesn't send). |
| **Webinar registration (learner-facing list)** | ❌ not built | `apps/web/src/pages/portal/WebinarsPage.tsx` | `state.learner.webinars` is a hardcoded `[]` in `learnerData.ts` — no backend endpoint exists. Page renders its honest empty state today; the "populated list" UI code already exists and needs no changes once a real backend lands. |
| **Apple sign-in** | ❌ not built | — | Needs a paid Apple Developer Program membership ($99/yr) + Services ID/private key/JWT client secret setup that hasn't started. The button was removed from the UI rather than left showing a permanent error. Google sign-in **is** real and configured (Google Cloud project `aiit-auth`). |
| **Error monitoring (Sentry)** | 🟡 | `main.ts`, `apps/web/vite.config.ts` | API: `SENTRY_DSN`. Web: `VITE_SENTRY_DSN` (statically eliminated from the bundle if unset — zero cost until configured), `VITE_VERCEL_ENV` tags events with the real Vercel environment. Source maps uploaded via `@sentry/vite-plugin` when `SENTRY_AUTH_TOKEN` is set, then deleted locally (never shipped alongside the built JS). |
| **Portal "refetch" behavior** | ✅ verified live this session | `apps/web/src/pages/portal/learnerData.ts` | Fixed this session (commit `8418550`) — see §13. |
| **Site-wide UI polish** (2026-10-14) | ✅ verified live | `FloatingActions.tsx`/`floating-actions.css`, `Footer.tsx`/`footer.css`, `Layout.tsx` | Floating buttons reordered so Quill is bottom-most/most prominent, WhatsApp next, scroll-to-top topmost with extra margin; Footer's "Learning now" column lost its course thumbnails + "By AIIT Network" byline and the whole `<Footer>` is now hidden for an authenticated learner browsing a public page (portal/instructor/admin/affiliate areas never rendered it anyway — they use their own layouts). The original webinar-page CTA-button pass this same day was superseded hours later by the full redesign below — see that row instead of this one for `/webinar`'s current state. |
| **Webinar page redesign** (2026-10-14/15, new) | ✅ verified live | `apps/web/src/pages/WebinarPage.tsx`, `webinar-page.css`, `apps/web/src/data/webinars.ts`/`types.ts` | Rebuilt from a detailed premium-editorial spec, several iterations based on live feedback against the deployed page (not a one-shot). Order: `PageBanner` (title/eyebrow/intro) → a compact one-line meta strip (`MetaRow`) → a dedicated, independent full-width video section (capped at 920px on desktop so it doesn't dominate a laptop screen, full-width on mobile; **not** forced side-by-side with the flyer) → a primary "Reserve My Free Seat" CTA banner → the three-field agenda grid (unchanged content, restyled) → "Who should attend" / "What you'll gain" as plain hairline-divided lists (no pill badges — explicitly asked to avoid a "SaaS template" look) → the actual registration form (`#register`, unchanged backend/logic) with the event-details `dl`, countdown, and the flyer (a *separate*, properly-sized 300px image, own label — not squeezed into a 180px thumbnail, which is what prompted removing it once before re-adding it properly). Video hosted on R2 (see that row); has its own dedicated 16:9 `videoThumbnail` poster image, deliberately **not** the portrait flyer (wrong aspect, looked messy stretched). Title deliberately avoids implying AIIT only covers "three technologies" (it covers far more per `/courses` — the number describes this one session's agenda, not AIIT's scope). No autoplay (deliberate — browsers block autoplay-with-sound anyway, and the stated audience is explicitly bandwidth-conscious — "Africa & Asia friendly" per the webinar's own data). **Also fixed in the same round:** Quill's mobile chat panel was a true `100dvh` overlay with no way to see the page behind it short of closing it — capped at `min(80dvh, 100dvh - 6rem)` as a bottom sheet instead (site-wide fix, `quill-chat.css`, not webinar-specific); the public "Instructors" nav entry was hidden (`data/navigation.ts`, one commented-out array line) at the project owner's explicit request — the page/route/data are untouched, trivially reversible. |
| **Blog admin CMS** (2026-10-14) | ✅ verified live, manual setup done | `apps/api/src/modules/admin/admin-blog.{controller,service}.ts`, `github-publisher.service.ts`, `dto/admin-blog.dto.ts`; `apps/web/src/pages/admin/AdminBlogPage.tsx`, `AdminBlogEditorPage.tsx`; `packages/shared/src/blog.ts`; `BlogPost` Prisma model + migration `20261014000000_blog_posts` | Admin can create/edit/preview a post in the DB (draft/scheduled/published/archived pipeline), then **Publish** commits a real `.md` file straight into `apps/web/src/content/posts/` via a hand-rolled GitHub Contents-API client (`GithubPublisherService` — no Octokit dependency, matching this codebase's "thin REST client, no SDK" house style). DB row is the authoring source of truth; the GitHub folder is still the *only* thing the live site actually renders from (`vite.config.ts`'s `buildPostsList()`, untouched). **Unpublish** deletes the live file via the same API before archiving the row. Cover images + the image/audio half of the media library still go through the backend-mediated Supabase Storage upload pattern (`blog-media` bucket, service-role write) — **video moved to Cloudflare R2, 2026-10-14/15** (see the new R2 row below): `POST /admin/blog/media/presign-video` returns a short-lived signed PUT URL, the browser uploads the file straight to R2 (never through this server — sidesteps the old flat 80MB multer ceiling), and `BlogMediaUploadResult`'s `kind: 'video'` case is now filled by that path instead. 10 curated "layout preset" CSS modifiers now exist (editorial/tutorial/news-brief/spotlight/data-deep-dive + listicle/case-study/visual-essay/magazine/video-feature) via a `preset` frontmatter key — engineer-authored CSS only, never admin-authored/free-form CSS. `GITHUB_TOKEN`/`GITHUB_REPO` set on Render and the `blog-media` bucket created (project owner confirmed). `ci.yml`/`deploy.yml` both got `paths-ignore` for the content/blog-asset folders. Scheduled publishing and draft autosave remain deliberate fast-follows, not gaps. |
| **Cloudflare R2 (video storage)** (2026-10-14/15, new) | ✅ verified live | `apps/api/src/common/r2/r2.service.ts`, `apps/web/src/pages/admin/AdminBlogEditorPage.tsx`, `apps/web/src/pages/WebinarPage.tsx` | `R2Service` wraps `@aws-sdk/client-s3`/`@aws-sdk/s3-request-presigner` — the one deliberate exception to this codebase's "no SDK" house style, since SigV4 presigned-URL signing is cryptographic, not a simple bearer header. **`forcePathStyle: true` is required** — R2 doesn't support virtual-hosted-style bucket addressing (`bucket.account.r2.cloudflarestorage.com` isn't a real host), and the SDK's v3 default produces exactly that broken hostname otherwise; this was live-debugged and fixed this session. Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (high-privilege), `R2_BUCKET_NAME` (`aiit-media`), `R2_PUBLIC_URL` (`https://media.aiit.network`, a Cloudflare custom domain, since this account's DNS is on Cloudflare — the alternative `pub-*.r2.dev` dev subdomain is explicitly not for production use). Two more layers had to be opened for this to actually work end-to-end, both easy to re-break by accident: the **R2 bucket's own CORS policy** (`AllowedOrigins` for `https://aiit.network`/`https://www.aiit.network`/local dev, `AllowedMethods: PUT`, `AllowedHeaders: content-type`) and **`apps/web/vercel.json`'s CSP** (`connect-src` needed `https://*.r2.cloudflarestorage.com` for the presigned PUT itself; a separate `media-src` directive — which didn't exist before — was needed for `<video>`/`<audio>` playback of anything hosted on R2 *or* the pre-existing Supabase-hosted audio/video, which was quietly broken by the same CSP gap and nobody had noticed yet since video embedding is brand new). First real file hosted: the webinar page's video, see the row below. |

---

## 6. Database and data flow

**Provider:** PostgreSQL via Supabase. Prisma `multiSchema` preview feature declares
both `public` and `auth` schemas (`auth` is Supabase-managed, not modeled — just
declared so Prisma can reconcile the cross-schema FK from `profiles.id` to
`auth.users.id`). All app-owned models/enums are `@@schema("public")`.

**34 models, 17 enums.** Full verified list (grouped by domain):

- **Identity:** `Profile` (1:1 extension of `auth.users` — role/status, profile-wizard
  fields, suspension/soft-deletion flags, affiliate-referral attribution),
  `AuditLog` (append-only admin-action log).
- **Affiliate:** `Affiliate` (account/application), `AffiliateApplication` (separate
  standalone public interest-form table, distinct from the account model).
- **Geo:** `GeoState`, `GeoCity` — static seeded lookups. **Not** FK'd from
  `Profile.country/state/city` or `Affiliate.country/state/city` — those are
  deliberately free-text, to keep records self-contained/exportable rather than
  joined.
- **Catalogue:** `CourseDomain`, `CourseCategory`, `Course` (core entity — pricing,
  level, badges, lifecycle status, soft-delete via `deletedAt`), `CourseModule`,
  `Lesson`, `LessonResource` (curriculum tables, soft-deletable, **seeded empty, not
  wired to UI** — see §5).
- **Enrollment & commerce:** `Enrollment`, `Order` (provider-agnostic payment record —
  one table for PayPal/Razorpay/Paystack, not one per provider; `amountCents`
  snapshots `Course.priceUsdCents` at order time).
- **Assignments & quizzes:** `Assignment`, `AssignmentSubmission`, `Quiz`,
  `QuizQuestion`, `QuizOption`, `QuizAttempt` (history kept — every attempt stored,
  not just the best).
- **Certificates:** `Certificate` (never deleted; revoked in place via
  `revokedAt`/`revokedReason`; `holderName` snapshotted at issuance).
- **Notifications:** `Notification`.
- **Live classes:** `Timetable`, `TimetableSlot`, `LiveClass` (whiteboard/poll/
  breakout state as JSON columns), `LiveClassAttendance`, `CourseInstructor`
  (many-to-many instructor↔course assignment).
- **Course communication:** `Announcement`, `Complaint`, `ComplaintMessage`
  (threaded, with an internal-note flag for staff-only replies).
- **Public forms:** `ContactMessage`, `NewsletterSubscriber`, `WebinarRegistration`,
  `CookieConsentLog` (append-only).

**Enums:** `Role`, `ProfileStatus`, `AffiliateType`, `AffiliateApplicationStatus`,
`CourseLevel` (extended via separate migrations — Postgres can't `ALTER TYPE ... ADD
VALUE` inside the same transaction as its first use), `PricingModel`, `CourseBadge`,
`CourseLifecycleStatus`, `DomainMotif`, `EnrollmentStatus`, `PaymentProvider`,
`OrderStatus`, `NotificationKind`, `NewsletterStatus`, `LiveClassStatus`,
`ComplaintCategory`, `ComplaintStatus`.

**Design patterns worth knowing before touching the schema:**
- Soft-delete (`deletedAt`) only on `Course`/`CourseModule`/`Lesson` — not a
  blanket convention across all models.
- No multi-tenancy — single-tenant platform.
- Plain-UUID references to `auth.users.id` throughout (no Prisma relation, since
  `auth` isn't modeled) — e.g. `Enrollment.userId`, `Order.userId`,
  `Notification.userId`, `Complaint.userId`.
- Snapshot-at-write is a recurring pattern (`Certificate.holderName`,
  `Order.amountCents`) specifically to stay historically accurate if the source
  data changes later.
- JSON columns for flexible data: `Profile.preferences`, `Course.technologies`,
  `Order.rawPayload`, `QuizAttempt.answers`, `AuditLog.metadata`, `LiveClass`'s
  whiteboard/poll/breakout state.
- **RLS (Row Level Security)** is the real authorization layer for several tables —
  enforced in migrations' raw SQL (not visible in `schema.prisma` itself). See §13
  for the specific RLS gotcha discovered this session (Storage, not table RLS).

**Migrations:** 49 folders, `20260910235959_stub_auth_schema` →
`20261010180000_storage_write_policies` (2026-09-10 → 2026-10-10). **Important
convention, repeated ~4 times in this history:** CI runs migrations against a *bare*
Postgres container, not real Supabase — so any migration that's the first to touch a
Supabase-only object (`auth.users.email`, `storage.buckets`, the `authenticated` role,
`storage.foldername()`) needs an explicit, guarded CI-only stub or CI's migrate step
fails (production is unaffected — real Supabase already has these). See §13 for the
full incident history; this is near-certain to recur the next time a migration touches
a new Supabase-only object for the first time.

---

## 7. UI/UX and design system

**Typography:** `--font-display` = Source Serif 4 (headings, editorial voice;
Georgia as a same-shape system fallback). `--font-ui` = Google Sans (body, buttons,
nav, forms — free/OFL-licensed, chosen to visually pair with Grok's Universal Sans).
`--font-accent` is a legacy alias, identical value to `--font-display` (two-serif
system was swept into one in Sept 2026 — kept as an alias so old call sites don't
need touching).

**Color:** black + warm cream + **one** metallic accent (brass `#9a7b4f`), nothing
bright/saturated. `--slate` is a rarely-used secondary. `--red` (`#c02b23`) is
reserved specifically for announcements/admissions CTAs. `.on-ink` utility class
provides a full dark/inverted token set (solid warm tints, not translucent — "no text
dissolving into the artwork behind it").

**Spacing:** 8px base scale, `--space-1` (4px) through `--space-11` (192px).
**Radius:** `--radius-xs` (2px) → `--radius-pill` (999px). **Motion:**
`--ease-out`/`--ease-in-out` cubic-beziers, `--dur-fast` (180ms) →
`--dur-cinematic` (1200ms) — `prefers-reduced-motion` respected throughout (verified
in multiple components this session, e.g. `FloatingActions.tsx`).

**Layout:** `--container` 1280px / `--container-wide` 1480px / `--container-text`
720px, fluid `--gutter`, `--nav-h`/`--header-h` 76px. Responsive down to 390px
(per README's "Where the frontend stands today" note — not independently
re-verified this session beyond the 560px breakpoint checks in `FloatingActions`
work).

**Component conventions observed this session:**
- Floating action buttons (`FloatingActions.tsx`) — stacked bottom-right, a
  circular "orb" pattern: a hover-unfurl label panel sliding out from behind a
  disc, used identically for the WhatsApp button, the back-to-top scroll-progress
  button, and the new Quill launcher (`.wa-orb`, `.scroll-orb`, `.quill-orb` in
  `floating-actions.css` — clone the pattern for a fourth, don't invent a new one).
- Modal/panel chrome: `createPortal` to `document.body` + a `.{x}__backdrop` /
  `.{x}__panel` pair, full-screen on mobile (`@media (max-width: 480px)`), used by
  `QuillChatPanel` and others.
- `aria-label`, `aria-modal`, `aria-pressed`, `role="dialog"` used consistently on
  interactive overlays; `Escape`-to-close wired via a `keydown` listener.

**No accessibility audit was performed this session** — `docs/production-readiness.html`
(dated 2026-09-12, stale — see §12) is the last documented WCAG pass and should not
be trusted as current.

---

## 8. Integrations and configuration

Full verified env-var inventory (names only, no values) from `apps/api/.env.example`
and `apps/web/.env.example`, cross-checked against `main.ts`/`app.module.ts` for
undocumented reads (none found):

**Database:** `DATABASE_URL` (required).

**Supabase Auth:** `SUPABASE_URL` (required — JWKS fetch for JWT verification),
`SUPABASE_SERVICE_ROLE_KEY` (high-privilege secret; optional — account-deletion
session-ban is skipped if unset, app-level block still applies; **also** now the
backbone of the backend-mediated file-upload path added this session, see §5/§13 —
this var is no longer optional in practice if avatar/assignment uploads need to
work).

**Server:** `PORT` (default 3000), `NODE_ENV` (default development), `CORS_ORIGINS`.

**Observability:** `SENTRY_DSN` (API, optional), `LOG_LEVEL` (default info).

**Rate limiting:** `THROTTLE_TTL` (default 60000ms), `THROTTLE_LIMIT` (default 100).

**Docs:** `SWAGGER_ENABLED` (default false).

**Anti-abuse:** `TURNSTILE_SECRET_KEY` (required for public forms — fails closed).

**Email:** `RESEND_API_KEY` (optional, fails open), `APP_URL` (default
https://aiit.network).

**Live classes:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
(high-privilege; required for live classes, fails open at feature level — 503 on
join only).

**Payments:**
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (high-privilege),
  `PAYPAL_API_BASE` (default sandbox), `PAYPAL_WEBHOOK_ID` (optional).
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (high-privilege),
  `RAZORPAY_WEBHOOK_SECRET` (optional).
- Paystack: `PAYSTACK_SECRET_KEY` (high-privilege — also signs webhooks directly,
  no separate webhook secret unlike the other two).

**AI (Quill):** `XAI_API_KEY` (optional — Quill is fully functional rule-based
without it; the documented seam for a real model later).

**Blog admin CMS:** `GITHUB_TOKEN` (fine-grained PAT, Contents read/write scoped to
this one repo only — high-privilege secret), `GITHUB_REPO` (`owner/repo`),
`GITHUB_BRANCH` (optional, defaults `main`), `GITHUB_POSTS_PATH` (optional, defaults
`apps/web/src/content/posts`). Left unset, drafts (create/edit/preview) still work
fully — only Publish/Unpublish fail with a clear, non-silent error. Also needs the
public Supabase Storage bucket `blog-media` (cover images + image/audio media
library — same `uploadToStorage`/service-role pattern as `avatars`/`submissions`).
**Both confirmed set/created and verified live as of 2026-10-14.**

**Cloudflare R2 (video storage, NEW 2026-10-14/15):** `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (high-privilege), `R2_BUCKET_NAME`
(`aiit-media`), `R2_PUBLIC_URL` (`https://media.aiit.network`). Left unset, the
presign-video endpoint 503s with a clear "not configured yet" error — image/audio
blog uploads and everything else keep working. **Confirmed set and verified live.**
See the R2 row in §5 for the CORS-policy and CSP gotchas that also had to be opened
for this to actually work end-to-end — the env vars alone aren't sufficient.

**Web app (`apps/web/.env.example`):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_API_URL` (default `http://localhost:3000`), `VITE_TURNSTILE_SITE_KEY`
(required for public forms to submit), `VITE_SENTRY_DSN` (optional),
`VITE_VERCEL_ENV`, `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` (build-time
only, source-map upload), `VITE_PAYPAL_CLIENT_ID`/`VITE_RAZORPAY_KEY_ID`/
`VITE_PAYSTACK_PUBLIC_KEY` (public payment keys — each provider's row on
`PaymentMethodPicker` hides itself if its var is unset).

**Deployment config files:** `apps/web/vercel.json` (SPA rewrites + asset caching +
security headers, including the CSP — `connect-src`/`media-src` updated 2026-10-14/15
for R2, see §5's R2 row). No `render.yaml` in-repo — Render is configured via its own
dashboard, not a blueprint file; `deploy.yml` triggers it via a deploy-hook URL
(`RENDER_DEPLOY_HOOK_URL` GitHub secret — this briefly went stale 2026-10-15,
re-pasting the same value from the Render dashboard into the GitHub secret fixed it;
no regeneration was needed, cause unconfirmed).

---

## 9. Implementation and verification status

**Verified working this session** (live browser testing via Claude-in-Chrome against
production aiit.network, plus passing automated checks):
- Avatar upload/remove and assignment-submission file upload — end-to-end, including
  the new backend-mediated path (§5, §13).
- Quill site-wide floating launcher — opens on non-course pages (general mode,
  real catalogue-grounded answers), still opens course-scoped from a course page's
  own button, conversation persists across client-side navigation, "New chat" +
  history reopen both verified working.
- Portal stale-while-revalidate fix — profile save / photo upload no longer blanks
  the page behind a full-page spinner.
- CI (`.github/workflows/ci.yml`) and Deploy (`.github/workflows/deploy.yml`) both
  green on the current `main` HEAD (`ec6db33`), confirmed via `gh run list`.

**Verified via automated checks (not manual browser testing) this session:**
- `apps/api`: full Jest suite — 60 spec files passing (exact count last confirmed
  mid-session: 462 tests).
- Both workspaces: `tsc --noEmit` clean, `eslint` clean (pre-existing
  `react-refresh/only-export-components` warnings in a handful of context-provider
  files are long-standing and don't fail `npm run lint`, which has no
  `--max-warnings` flag set).
- Both workspaces: production build (`npm run build`) succeeds.

**Not independently verified this session** (true of most of the application —
pre-existing code this session didn't touch): payments checkout flows end-to-end
with real provider credentials, live classroom video/whiteboard/breakout behavior,
certificate PDF rendering, admin portal CRUD flows, instructor grading flow, affiliate
e-signature flow, accessibility compliance, cross-browser behavior, SEO/sitemap
correctness. These are not *known broken* — just not re-confirmed in this audit pass;
treat the README's descriptions of them (§5 above summarizes README's claims) as
plausible-but-not-freshly-verified.

**Known stale documentation** (verified by direct inspection, not assumption):
- `docs/production-readiness.html` — version 1.13, **"Last updated: 12 September
  2026"**. Predates the live-classroom buildout, payments, affiliate program, Quill,
  the profile wizard, and this session's upload/portal/Quill work. Its P0/P1/P2
  backlog should **not** be trusted as current without a fresh pass — see §12.
- Root `README.md`'s "Backend" section, Quill bullet: still describes Quill as
  "the course-advisor assistant on every course detail page" — doesn't reflect the
  site-wide floating-launcher + chat-history upgrade shipped this session (§5).
- Root `README.md`'s "File storage" bullet: still describes avatar/submission
  uploads as going directly to Supabase Storage with RLS scoping — doesn't reflect
  the backend-mediated upload architecture change shipped this session (§5, §13).
  *(README.md itself was not edited this session — out of scope for the memory-audit
  task; flagging here so a future session knows not to trust those two bullets.)*

**No inline TODO/FIXME/HACK/XXX markers exist anywhere in `apps/api/src` or
`apps/web/src`** (verified via grep across both trees — the one surface hit, a
placeholder string `"AIIT-AFF-XXXXXX"` in `AffiliateDashboardPage.tsx`, is not a
code marker).

**Addendum, 2026-10-14, later the same day:** the Blog CMS and site-wide UI polish
rows above (and everything in the §15 entries through "Affiliate portal split +
region-aware payout + referral-redirect fix") are now committed, pushed, and
live-verified via direct `curl` content-fetch of the deployed JS chunks (not just
CI/Deploy green) — see that §15 entry for the exact method and what was checked.
`npx jest --silent` in `apps/api` was green at 482/482 immediately before that
round's commits.

---

## 10. Decisions and development constraints

| Decision | Rationale | Files/features | Status |
|---|---|---|---|
| Backend-mediated file uploads (not direct browser→Storage) | Supabase Storage's RLS evaluation was failing to bridge the request JWT into the Postgres session context for this specific project — confirmed via extensive live multi-round debugging (correct policies, correct bucket config, correct JWT claims, `auth.uid()` resolves correctly in a raw SQL test — yet every direct upload got 403). Platform-level issue, not fixable from app code or migrations. | `supabase-admin.service.ts`, `profile.service.ts`, `assignments.service.ts`, `ProfilePage.tsx`, `AssignmentRow.tsx` | Confirmed — shipped and live-verified |
| Upload storage key always derived server-side from the authenticated user's ID | Replaces the per-user-folder isolation RLS was supposed to provide, now that the upload path bypasses RLS entirely via the service-role client. Never accept a client-supplied storage key. | Same as above | Confirmed, security-reviewed in-session before implementing |
| Quill: one global `QuillProvider` instance at the `App.tsx` root, not inside `Layout.tsx` | Every public page mounts its own `<Layout>` (no shared parent route) — a provider inside `Layout` would reset on every navigation, killing conversation persistence. Verified by reading `App.tsx`'s actual route structure before deciding, not assumed. | `apps/web/src/App.tsx`, `apps/web/src/lib/QuillContext.tsx` | Confirmed — this exact placement, not `Layout.tsx` |
| Quill chat history: localStorage only, no backend persistence | Matches the server's existing stateless design (no session); Quill serves anonymous visitors anywhere on the site, not just logged-in learners — no account to tie history to. | `apps/web/src/lib/quillHistory.ts` | Confirmed |
| `useLearner()` refetch is stale-while-revalidate, not loading-reset | Every portal page gated its entire render on `status === 'loading'`; flipping back to loading on every refetch blanked the whole page to re-fetch data already on screen. | `apps/web/src/pages/portal/learnerData.ts` | Confirmed — fixed this session |
| CI uses a bare Postgres container, not real Supabase | Keeps CI fast/self-contained, but means any new migration touching a Supabase-only object needs an explicit guarded stub (see §6, §13) — an accepted, recurring maintenance cost, not considered worth re-architecting (e.g. to a real ephemeral Supabase branch) as of this audit. | `.github/workflows/ci.yml`, several `*stub*` migrations | Standing, provisional (no plan to change it found in the repo) |
| Provider-agnostic `Order` table for all 3 payment providers | One schema to reason about instead of three near-duplicate tables. | `prisma/schema.prisma` | Confirmed, long-standing |
| Blog: `BlogPost` DB row is the authoring/workflow source of truth; the GitHub content folder stays the only thing the live site renders from | Lets drafts/metadata/status live in a real DB (filterable admin list, no git-history churn from autosaves) without changing the public site's existing build-time-ingestion architecture at all. A row only becomes a real post once Publish commits a matching file. | `prisma/schema.prisma` (`BlogPost`), `admin-blog.service.ts` | Confirmed — this session, not yet deployed |
| Blog: hand-rolled GitHub Contents-API client, not the Octokit SDK | Matches this codebase's existing "thin REST client, no SDK" convention for third-party HTTP integrations (`SupabaseAdminService`, the PayPal/Razorpay/Paystack clients) — one fewer dependency, same pattern to maintain/mock. | `github-publisher.service.ts` | Confirmed — this session |
| Blog: cover images hosted permanently in Supabase Storage, never committed into the repo | `assetUrl()`'s own doc comment already treats an external URL as a fully-supported, unchanged case (only local `/assets/...` paths get the cache-busting version tag) — no need to download+commit image bytes on every publish. | `admin-blog.service.ts` (`uploadCoverImage`), `apps/web/src/lib/assetUrl.ts` | Confirmed — this session |
| Blog: 5 curated CSS layout presets (editorial/tutorial/news-brief/spotlight/data-deep-dive), never admin-authored/free-form CSS | Free-form CSS from an admin input rendered on a public page is a real injection/governance risk and isn't how a professional CMS handles "unique design per post." | `resource-detail.css`, `ResourceDetailPage.tsx`, `vite.config.ts` | Confirmed — this session |
| Floating-action stack reordered: Quill bottom-most (most prominent), WhatsApp middle, scroll-to-top topmost with extra margin | Explicit product request — DOM order = visual stacking order here (`flex-direction: column`, last child nearest the screen corner). | `FloatingActions.tsx`, `floating-actions.css` | Confirmed — this session |
| Footer hidden for an authenticated learner on a public page | Explicit product request ("footer isn't necessary for users already in") — portal/instructor/admin/affiliate areas already never rendered it (separate layouts), so this only affects the shared `<Layout>` on public pages. | `Layout.tsx` (`useAuth()` check) | Confirmed — this session |
| Charge amount / role / storage path never trusted from the client | Core security invariant repeated across payments, auth, and file uploads. | Throughout `apps/api` | Confirmed, long-standing |
| Curriculum tables (`CourseModule`/`Lesson`/`LessonResource`) exist but aren't wired to UI | Learner experience is live-class + assignments + quizzes, not a self-paced lesson browser, by current product direction. | `prisma/schema.prisma`, no corresponding frontend route | Standing — unclear if this is a future-phase decision or abandoned; not confirmable from code alone |

---

## 11. Current development position

**Last completed objective (this session, 2026-10-14→15, latest round):** starting
from "where are blog videos stored, and should they go to R2 instead," this grew into
a full Cloudflare R2 integration plus a complete webinar-page redesign, with several
real bugs found and fixed live against production as the project owner actually used
each feature. Net result, all **committed, pushed to `main`, and live-verified**
(direct `curl` content-fetch of the actual deployed JS/CSS — see §9's addendum; CI
and Deploy both green on every push except two Deploy runs that failed purely on the
Render deploy-hook step, re-run successfully afterward with no code change):

1. **Direct-to-R2 presigned video upload** for the blog admin's media library
   (`POST /admin/blog/media/presign-video`) — replacing the old 80MB
   memory-buffered-through-this-server path for video specifically (image/audio
   unchanged, still Supabase-backed). Took three real rounds to get fully working,
   each a genuine bug found via the project owner's own live testing, not
   hypothetical: (1) `forcePathStyle: true` missing on the S3 client — R2 doesn't
   support virtual-hosted-style bucket addressing, (2) the R2 bucket's own CORS
   policy (none existed), (3) `apps/web/vercel.json`'s CSP `connect-src` never
   allowed R2's domain, and a `media-src` directive didn't exist at all (which
   also means the *existing* Supabase-hosted audio/video embed feature was quietly
   broken for playback this whole time — nobody had noticed because video embedding
   in a published post is brand new). See §5's R2 row for full detail.
2. **Affiliate/Student "overlap" investigated and resolved** — confirmed not a bug
   (affiliate-ness has never been a `Profile.role`), but the admin UI genuinely had
   no visibility into it. Added cross-links between the Students and Affiliates
   admin views, an `includeAffiliates` filter (default: hide affiliate-only
   accounts from Students), and a `q` search param on `GET /admin/affiliates` that
   didn't exist before. See §5's Admin portal / Affiliate program rows.
3. **Webinar page fully redesigned**, then iterated on live feedback several times
   in the same session: video embed → full editorial restructure → poster-image
   fix → flyer removed then re-added properly sized → Instructors nav hidden →
   Quill's mobile full-screen overlay fixed → video width capped on desktop →
   two rounds of excess-whitespace fixes (stacking `Section` paddings). See §5's
   Webinar page redesign row for the complete current structure.
4. The Render deploy-hook secret went stale partway through (`Trigger Render
   deploy` failing with an HTTP error on the `deploy-api` job, migrations
   themselves were fine) — the project owner re-pasted the same value from Render's
   dashboard into the GitHub secret (no regeneration), and a `gh run rerun --failed`
   on the last failed Deploy run confirmed it fixed. Root cause of *why* it went
   stale was never determined — worth a note if it recurs.

Also still true from earlier in the session and unaffected by the above: the
affiliate Phase 1 build-out (payouts, portal split, referral-redirect fix), the 5
original product asks (floating buttons, footer, staff auth fixes), and the Blog CMS
build — all committed, pushed, and live-verified in earlier rounds of this same
session (see §15's older entries for that detail, not repeated here).

**Verification performed this round:** both workspaces `tsc --noEmit` clean, `eslint`
clean on every touched file, after every single commit in this round (small,
frequent commits rather than one large one, since several rounds were direct fixes
to live-reported bugs); `apps/api` full Jest suite 61 suites / 483 tests green;
`apps/web` production build succeeds every time. **No Claude-in-Chrome browser
automation was available at any point this session** ("Browser extension is not
connected" every attempt) — every live-verification claim above and in §5 is from
direct `curl` fetches of the actual deployed bundle/CSS/API responses (confirming
real content, not just that a same-named file/route exists), not from visually
viewing the rendered page. The project owner was the one actually looking at the
rendered page and screenshotting issues back — that's how the webinar-page iteration
loop actually worked this round.

**Not done this session, flagged for whoever picks this up next:**
- No live browser test of the referral→register→signup→`registrationCount`
  end-to-end path (carried over from the affiliate round, still unresolved — see
  §15's older entry for detail).
- *Why* the Render deploy-hook secret went stale was never root-caused (point 4
  above) — if it recurs, worth checking Render's own deploy-hook rotation
  behavior/logs, which this session had no access to.
- LiveKit session recording is still not built — the storage-bucket *decision* that
  blocked it is now resolved (R2 exists, is wired up, and works), but no Egress
  API/`Recording` model work has started. This is now a scoped build task.
- The retired legacy `affiliate_applications` table / admin-list-filter theory from
  the original affiliate investigation was never confirmed either way with the
  project owner — still an open question if "application not showing up" recurs.

**Next verification step for whatever is picked up next:** the standard loop already
established in this project — `npx tsc --noEmit` + `npx eslint` + relevant Jest suite
+ `npm run build` in both workspaces, then push to `main` and watch `gh run list`/
`gh run watch` for both the `CI` and `Deploy` workflows before considering it done;
for anything user-facing, live-verify via Claude-in-Chrome against aiit.network itself
if it's connected this time (it has not been, all session) — otherwise fall back to
the `curl`-based deployed-chunk content check described in §9's addendum (browser
automation is scoped to aiit.network only, never third-party dashboards like
Supabase/Render/GCP/Cloudflare, which the project owner drives themselves).

---

## 12. Outstanding work and prioritized backlog

**Confidence note:** P0–P2 below are only the items this audit could directly verify
from source code or this session's own work. `docs/production-readiness.html`'s
backlog (content gaps, accessibility, SEO, performance, legal) is **not** reproduced
here because it's dated 2026-09-12 and unverified against the current codebase — see
§9/§11. Treat anything not listed below as **unknown priority, needs fresh triage**,
not "no outstanding work."

**P1 — confirmed gaps, no workaround needed, real product features missing**
- Webinar registration backend (`/portal/webinars` always empty). Files:
  `apps/web/src/pages/portal/WebinarsPage.tsx`, `learnerData.ts`. Acceptance: a real
  endpoint populating `LearnerRecord.webinars`, replacing the hardcoded `[]`.
- Apple sign-in. Blocked on a paid Apple Developer Program membership + Services
  ID/key setup — an external/account dependency, not a code task alone.
- Live-class session recording. The storage-bucket *decision* this was blocked on
  is now resolved (Cloudflare R2 is live and working, 2026-10-14/15 — see §5) — this
  is now a scoped code task (LiveKit Egress API wiring + a `Recording` model),
  not a decision dependency.
- Payment refund tooling. `OrderStatus.refunded` exists but nothing calls a
  provider's refund API yet.

**P2 — cleanup / accuracy, no user-facing impact**
- ~~Delete unused `uploadFile()`/`removeFile()` in `apps/web/src/lib/storage.ts`~~ — done 2026-10-13.
- Update `README.md`'s Quill and File-storage bullets to match current
  architecture (§9).
- Breakout-room instructor moderation reaching individual breakout rooms, not just
  the main room.

**P1 — affiliate program, confirmed gap, not yet live-tested (2026-10-14, see §11)**
- No live end-to-end test of a `/r/:slug` click → `/register` → signup →
  `registrationCount` incrementing. The code chain was audited by reading, not
  exercised through a real browser flow (no working browser automation all
  session). Next session: either get the project owner to test a real referral
  signup, or try Claude-in-Chrome again if it's connected.
- Admin Payouts UI (`AdminAffiliatesPage.tsx`'s `RecordPayoutForm` + earnings
  display) hasn't been re-opened live since the portal-split round — quick sanity
  check worth doing.

**P3 — Blog CMS, deliberate fast-follows (not gaps, scoped out of this round)**
- Draft autosave (debounced save while editing).
- Scheduled publishing — `scheduledAt`/`'scheduled'` status already exist in the
  schema/DTO, but nothing sweeps them yet; needs a `@nestjs/schedule` cron job
  reusing `AdminBlogService.publish()`.
- Edit-then-republish is already supported (Publish on an already-published post
  commits an update) — not a gap, just not separately highlighted in the UI as
  "republish" vs. "publish."
- RSS feed generation from the existing post list.

**P3 — minor, from the 2026-10-14/15 R2/webinar round**
- Root-cause *why* the Render deploy-hook secret went stale (§11, point 4) — fixed
  by re-pasting the same value, cause unconfirmed. Low priority unless it recurs.
- `/instructors` nav entry is intentionally hidden (`data/navigation.ts`, one
  commented-out line, project owner's explicit request 2026-10-15) — not a bug,
  don't "fix" it back without being asked; the page/route/data are untouched.

**P3 / needs a fresh audit, not fabricated here**
- Everything in `docs/production-readiness.html` (content completeness, a11y, SEO,
  performance, legal/cookie-consent text, cross-browser QA) — do not assume its
  old priorities or statuses are still accurate; re-derive from current source
  before acting on any item from it.
- CI's recurring "new migration touches an unstubbed Supabase-only object" failure
  mode (§6, §13) — not itself a bug to fix, but worth a structural fix (e.g. a
  more complete baseline stub, or documentation reminding future migrations to
  check) if it keeps costing debugging time.

---

## 13. Known issues and troubleshooting

### Supabase Storage RLS failure (root cause: confirmed, platform-level)
**Symptom:** avatar/assignment-submission uploads from the browser directly to
Supabase Storage consistently returned 403 `AccessDenied` / "new row violates
row-level security policy", despite: the RLS policy being present and logically
correct (confirmed — in fact two independent, structurally identical permissive
policies existed simultaneously at one point), the bucket config being correct
(`public`, size limit, MIME allowlist all right), the browser's JWT having correct
`sub`/`role`/`aud` claims, and a raw SQL test in Supabase's SQL Editor
(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '...'; SELECT
auth.uid()`) correctly resolving the matching UID.
**Root cause:** Supabase Storage's own service was failing to correctly bridge the
request's JWT into the Postgres session context it evaluates RLS against, for this
specific project — a platform-level bug, not something fixable via migrations or
application code.
**Fix (confirmed working, live-verified):** route uploads through the NestJS API
using the existing service-role Supabase admin client, bypassing the broken RLS
path entirely. See §5, §10.
**Do not** re-attempt a direct-browser-to-Storage upload fix without new evidence
Supabase's platform behavior has changed — this was a thorough, multi-round,
evidence-based diagnosis, not a guess.

### CI failures from Supabase-only schema objects (root cause: confirmed, structural, recurring)
**Symptom:** `.github/workflows/ci.yml`'s "Apply migrations" step fails with
`Error: P3018` / "relation/role/function ... does not exist", while
`.github/workflows/deploy.yml`'s equivalent step against the real production
database succeeds fine on the same migration.
**Root cause:** CI runs migrations against a bare `postgres:16-alpine` container
with none of Supabase's built-in objects (the `authenticated` role, the `storage`
schema/`storage.buckets`, `storage.foldername()`, `auth.users.email`, etc.) — a
migration that's the first to reference one of these for the first time fails in
CI even though it's completely fine against real Supabase, where the object already
exists.
**Confirmed historical incidents (all already fixed):**
1. `auth.users.email` missing → `20260925010000_test_instructor` failed → fixed
   same day, commit `f30bcd4` (wrapped the UPDATE in a `DO $$ ... EXCEPTION WHEN
   undefined_column` guard).
2. `storage.buckets` missing → `20261010000000_storage_bucket_limits` failed →
   fixed same day (added a guarded CI-only stub table).
3. `authenticated` role + `storage.foldername()` missing →
   `20261010180000_storage_write_policies` failed across ~19 consecutive CI runs
   this session while the Storage-RLS issue above was being live-debugged → fixed
   this session via two new guarded stub migrations
   (`20261010170000_ci_stub_authenticated_role`,
   `20261010175000_ci_stub_storage_foldername`) — confirmed green since.
**Also confirmed as pure infra flakes, not code issues, during this same audit:**
Docker Hub anonymous-pull rate-limiting on `postgres:16-alpine` (2 occurrences,
2026-10-09 evening) and an npm registry 404 on a package tarball (1 occurrence,
2026-10-08) — both self-resolved on retry, nothing to fix.
**Action if this recurs:** check the failing migration for what Supabase-only
object it references, add a guarded (existence-check, never `CREATE OR REPLACE`
on anything that might already be real in production) stub migration timestamped
just before it, following the exact pattern of the three stub migrations above.

### Dead code in `apps/web/src/lib/storage.ts` — resolved 2026-10-13
`uploadFile()`/`removeFile()` had become unused after the backend-mediated-upload
fix (confirmed via grep); deleted. `publicFileUrl()` is the file's only remaining
export and is still live and correct.

---

## 14. Development conventions

- **File organization:** one directory per domain in both `apps/api/src/modules/`
  and `apps/web/src/pages/{portal,instructor,admin,affiliate}/` — consistent
  `*.controller.ts` + `*.service.ts` + `dto/` + `*.spec.ts` shape on the backend.
- **Shared types first:** a cross-stack feature change starts in
  `packages/shared/src/<domain>.ts`, then the backend DTO/controller, then the
  frontend call site — in that order, so both ends compile against the same
  contract throughout.
- **Server-side trust boundary:** never accept a client-supplied price, role, or
  storage path — always re-derive from authenticated server state. This is the
  single most repeated security pattern across the whole backend (see §10).
- **Validation:** global `ValidationPipe({ whitelist: true, forbidNonWhitelisted:
  true, transform: true })` — any DTO field not explicitly declared is rejected
  with 400. New optional fields need `@IsOptional()` explicitly.
- **Testing:** every backend module gets its own `*.spec.ts`; mock the module's
  direct dependencies, not the whole Nest DI graph. No frontend test suite exists
  — frontend changes are verified via `tsc`/`eslint`/build + live browser
  verification against production, not automated tests.
- **Comments:** this codebase writes unusually extensive "why" comments
  explaining non-obvious decisions, prior debugging history, and rejected
  alternatives (see almost any file touched this session) — a deliberate,
  consistent house style, not noise to clean up.
- **Git workflow:** direct commits to `main` (solo development — no observed PR
  review workflow in this repo's actual history, despite `docs/
  infrastructure-setup-and-workflow.pdf` describing a two-engineer branch/PR
  process; that doc may also be stale/aspirational, same caveat as the other docs
  in §9). Commit messages explain *why*, not just *what*. Temporary
  diagnostic/workaround commits are explicitly labeled as temporary and paired
  with a follow-up commit removing them once resolved (verified pattern across
  ~15 commits during this session's Storage-RLS debugging).
- **Deployment:** every push to `main` runs migrations against production then
  triggers a Render deploy (`deploy.yml`) — there is no staging/preview
  environment for the API. Treat every push to `main` as a production deploy.
- **Browser automation scope:** Claude-in-Chrome is used only against
  `aiit.network` itself (navigation, testing flows, screenshots, live
  verification) — never against third-party dashboards (Supabase, Render, GCP,
  Vercel); the project owner drives those themselves.

---

## 15. Session handover log

### 2026-10-14 to 2026-10-15 — R2 video storage + affiliate/student admin visibility + webinar page redesign

**Objective:** started from a simple question ("where are blog images/videos
stored, and should R2 hold video?"), which the project owner then asked to actually
build. Along the way: a reported "affiliate showing up as a student" issue, a
ground-up webinar-page redesign (detailed premium-editorial spec), and several
rounds of direct live-feedback fixes against the deployed site as the project owner
actually used each thing.

**What shipped (10 commits, `dd34739`..`f70d62d`, each individually
`tsc`/`eslint`-clean and pushed after full verification):**
1. `R2Service` (`apps/api/src/common/r2/r2.service.ts`) — presigned-URL direct
   browser→R2 upload for blog video, replacing the old 80MB memory-buffered path
   for video only. Uses `@aws-sdk/client-s3`/`-presigner`, the one deliberate
   exception to this codebase's no-SDK house style (SigV4 signing isn't a simple
   bearer header). **Three real bugs found via the project owner's own live
   testing, not hypothesized:** missing `forcePathStyle: true` (R2 doesn't support
   virtual-hosted-style addressing — the SDK's default produced a non-existent
   hostname), no CORS policy on the R2 bucket, and `vercel.json`'s CSP never
   allowing R2's domain in `connect-src` — plus a `media-src` directive that didn't
   exist at all, which turned out to *also* have been silently breaking the
   pre-existing Supabase-hosted audio/video embed feature (nobody had noticed since
   video embedding in a published post is brand new).
2. Affiliate/Student admin visibility: confirmed via full code trace that an
   affiliate showing up under Students is **not a bug** — `Role` has no `affiliate`
   value, affiliate-ness is tracked only by whether an `Affiliate` row exists (see
   the schema comment). The real gap was the admin UI having zero way to see both
   halves of a person — added cross-links (Students↔Affiliates), an
   `includeAffiliates` filter (hides affiliate-only/never-enrolled accounts from
   Students by default), and a `q` search param on `GET /admin/affiliates` that
   didn't exist before.
3. Webinar page: full redesign (PageBanner → compact meta strip → independent
   full-width video → primary CTA → three-field agenda → who-should-attend/
   what-you'll-gain as plain hairline lists → event details+flyer+form), then
   iterated live several times from the project owner's screenshots: video poster
   needed its own 16:9 asset (not the portrait flyer), the flyer was pulled then
   re-added at a real size (300px, not a cramped 180px), the title was broadened
   (AIIT covers far more than "three technologies" per `/courses`), the video was
   capped at 920px on desktop (read as oversized full-width on a real laptop), and
   two rounds were needed to actually kill a stacked-`Section`-padding gap between
   the meta row and the video (each `Section` contributes its own padding; three
   different paddings were compounding to ~230px of dead space).
4. Also fixed in the same round, both reported from mobile screenshots: Quill's
   chat panel was a true `100dvh` overlay on mobile with no way to see the page
   underneath short of closing it — capped at `min(80dvh, 100dvh - 6rem)` as a
   bottom sheet (site-wide fix, not webinar-specific); the public "Instructors" nav
   link was hidden at the project owner's explicit request (page/route/data
   untouched, one commented-out array line, trivially reversible).
5. Mid-round, the `RENDER_DEPLOY_HOOK_URL` GitHub secret went stale (two Deploy
   runs failed on just the `Trigger Render deploy` step, migrations fine) — fixed
   by the project owner re-pasting the same value from Render's dashboard (no
   regeneration), confirmed via `gh run rerun --failed` on the last failed run.

**Verification methodology, worth noting for next time:** Claude-in-Chrome never
connected this entire session (as with the rest of this project's history so far).
Every "verified live" claim above comes from direct `curl` fetches of the actual
deployed JS bundles/CSS/API responses — tracing the real asset-manifest chain
(index.js → its dependency map → the specific named chunk) rather than trusting a
same-named file's mere existence, which caught at least one false-positive during
this round (an old local-build hash that coincidentally still 200'd via Vercel's
SPA-rewrite fallback, serving `index.html` instead of the expected JS). The project
owner did the actual visual verification by using the live site and screenshotting
problems back — that's what actually drove the webinar-page iteration loop, not
anything this session could see directly.

**Unresolved/handed back:** see §11's "Not done this session" list — the referral
end-to-end live test still needs a real browser or a project-owner test click; why
the Render hook secret went stale was never root-caused; LiveKit recording is now
a scoped, unblocked build task but still not started.

### 2026-10-14 (same day, third/fourth round) — Affiliate earnings/payout Phase 1 + portal split + referral-redirect fix

**Objective:** following the second-round affiliate bug-fix/manual-add entry below,
the project owner asked for a real earnings/payout feature (manual payouts only,
PayPal-or-bank, region-aware), then — while that was mid-build — three more asks
arrived in quick succession: split the one-page dashboard into Dashboard/Link/Payout
pages with real PayPal/bank icons and tighter payout-page security, add a Settings
page, and fix the referral link so a click visibly carries through to signup with the
affiliate count "real and counting."

**Shipped, backend (commit `d459335`, then `9ff9769`):**
- `AffiliatePayout` ledger table + `payout_*` columns on `Affiliate`
  (migration `20261014150000_affiliate_payouts`, applied via `prisma migrate deploy`
  on push — confirmed by a green Deploy run).
- `computeEarnings(prisma, affiliate, count)` — one function, called by both the
  affiliate's own `GET /affiliates/me` and the admin's detail view, so the two
  can't show different numbers. Tiered $7/$10 for direct referrals, flat $5 for
  creator-introduced, `null` (count-only) for affiliate-to-affiliate — matches
  `apps/web/src/data/blueprint.ts`'s published rates exactly.
- `PUT /affiliates/me/payout` (tighter 6/60s throttle, IP captured in the audit
  entry's metadata — no new DB column, reuses `AuditService.record()`'s existing
  JSON metadata) and `POST /admin/affiliates/:id/payouts` (admin records a payout
  after sending it manually).
- `PUT /affiliates/me/contact` — self-service edit of the phone/handle/location/
  motivation fields given at application time (`update-contact.dto.ts`).
- All covered by Jest (482/482 passing across 61 suites at the end of this round).

**Shipped, frontend (commits `3ef6db4`, `2e73c34`):**
- `/affiliate-portal` split into 4 routed pages (was 1) — Dashboard (stats +
  agreement + quick-link cards), `AffiliateLinkPage.tsx` (referral-link box, moved
  as-is), `AffiliatePayoutPage.tsx` (new: region-aware India/IFSC + Nigeria/NUBAN+
  bank-dropdown + generic-other bank form, original non-trademarked wallet/bank
  SVG icons instead of a plain `<select>`, a masked account-number field with a
  show/hide toggle, a double-click confirm before overwriting an *already-saved*
  payout method, and the affiliate's own payout history), `AffiliateSettingsPage.tsx`
  (new: change password via `supabase.auth.updateUser()` — no current-password
  re-entry needed, session's already active — plus the contact-details edit form).
- `ReferralRedirect` in `App.tsx` now sends `/r/:slug` to `/register` instead of `/`
  (the prior behavior was deliberate — see the old code comment — but left a click
  with zero visible confirmation it worked). `RegisterPage.tsx` now shows a
  "Referral applied: ⟨slug⟩" banner whenever `getPendingReferralSlug()` is non-null
  — privacy-safe by design (shows the code, never the affiliate's identity).

**Verification of the "is the count real" ask — read-through, not a live test:**
Confirmed by reading `prisma/migrations/*/migration.sql` that exactly 3 migrations
ever touch `handle_new_user()` (`20260912000001_auth_trigger`,
`20260913020000_backfill_profile_names`, `20261002010000_affiliate_referral_trigger`)
and that the Oct-2 one — which reads `raw_user_meta_data->>'referral_slug'`, looks up
the matching `Affiliate`, and sets `profiles.referred_by_affiliate_id` — is the latest
by filename timestamp, so nothing clobbers it. `registrationCount` is
`prisma.profile.count({ where: { referredByAffiliateId: affiliate.id } })`, consistent
with that column. **This was not exercised through an actual signup** — Claude-in-
Chrome never connected this entire session, so there was no way to click a real
`/r/:slug` link and watch a row appear. Flagged as the one open item in §11/§12.

**Live verification method used (no working browser automation):** `curl -sL` the
deployed homepage → its `index-*.js` → grep for the new lazy-chunk filenames
(`AffiliateLinkPage-*.js` etc. — confirmed all 4 pages are separate chunks) → fetch
each chunk and grep for distinctive new strings (`IFSC`, `NUBAN`, `Nigeria`, "Referral
applied") to confirm the actual new logic shipped, not just a same-named stale chunk.

**Process note for future sessions:** this round arrived as 3 stacked user messages
while still mid-build on the previous one (earnings/payout) — all were tracked and
addressed in full by the end of the round rather than only answering the latest one.

### 2026-10-14 (same day, second round) — Affiliate form bug fix + manual-add feature
**Objective:** following up the affiliate investigation above, the project owner
hit the exact "account already exists" 409 path live and reported the error as
"it just loads and nothing is done" plus a mysterious blank space on the form.
Also asked for an admin-side "add affiliate manually" button (for people AIIT
already has a relationship with outside the public form) with the same
email-a-temporary-password treatment as staff accounts, and asked for the
affiliate sign-up/sign-in structure to be explained.
**Root cause found (real bug, not a hypothesis):** `AffiliatePage.tsx` renders its
error banner with `className="auth__alert"` but never imports `auth.css` (where
that class's actual red/pink alert styling lives) — `affiliate-page.css` only
reset its `margin`, so the message fell back to the ambient `.on-ink` section's
light text tint, rendering as near-invisible pale text on the cream form card.
That's the "blank space." Fixed by giving `.affiliate__form > .auth__alert` its
own color/background rule (same visual treatment as `auth.css`'s real one), and
added a "Sign in →" link directly in that specific message (routed back to
`/affiliate` via router `state.from`, reusing `LoginPage.tsx`'s existing
post-login-redirect plumbing — no backend change needed).
**Affiliate sign-up/sign-in structure (as requested, for the record):**
affiliate-ness is **not a Profile.role** — it's just "does an `Affiliate` row
exist for this user" (see schema.prisma's comment on the model). A brand-new
applicant's account is created server-side with a one-time password
(`AffiliatesService.applyNew()`), emailed to them. **They sign in at the exact
same `/login` page students use** — there is no separate affiliate sign-in
page. After signing in they land on `/portal` like any learner; to reach
`/affiliate-portal` they either click the "Go to your affiliate dashboard"
link that appears on the public `/affiliate` page once `hasApplied` is true, or
navigate to `/affiliate-portal` directly — **there is no persistent header/nav
link to it today**, which is a real (pre-existing, not touched this session)
navigation gap worth flagging for a future pass.
**Shipped:** the alert-visibility fix above; a new `AffiliatesService
.createManually()` (mirrors `applyNew()`'s account-creation half, but
deliberately leaves `signedName`/`agreementVersion`/`signedAt`/`signedIp` null
rather than fabricate e-signature evidence, defaults to `'approved'` status)
exposed as `POST /admin/affiliates`; a new "Add affiliate manually" button +
form on `AdminAffiliatesPage.tsx`. `AffiliatesModule` now exports
`AffiliatesService` so `AdminModule` can inject it.
**Verification:** `tsc`/`eslint` clean on every touched file in both
workspaces; full API suite green (61 suites/472 tests, +4 new since the
morning's 468 — one new `admin-affiliates` test, three new `AffiliatesService
.createManually` tests); `npm run build` (apps/web) succeeds.
**Git:** all of today's work (this round + the morning's five-task round) is
now committed as 7 separate commits (see `git log`), **none pushed to `main`
yet** — the project owner asked for separate commits specifically, pushing
was not requested/confirmed.
**Unresolved/handed back to the project owner:** the GitHub fine-grained PAT
(walked through the correct Developer Settings path this round — Personal
access tokens → Fine-grained tokens, not OAuth Apps — with Resource owner set
to the organization); `GITHUB_TOKEN`/`GITHUB_REPO` still not set in Render;
`blog-media` bucket creation status not confirmed (project owner said "created"
but this wasn't independently verified in a browser this session); nothing
pushed/deployed/live-verified. The no-nav-link-to-affiliate-portal gap noted
above is a candidate for a future small fix, not done this session.
**Next action:** push these 7 commits once the project owner confirms, then
complete the manual GITHUB_TOKEN/bucket steps and live-verify the Blog CMS and
the affiliate fixes together.

### 2026-10-14 — Five product asks: UI polish, staff auth fixes, Blog CMS, affiliate investigation
**Objective:** implement five tasks handed over directly by the project owner: (1)
floating-action icon reorder/spacing, (2) footer declutter + guests-only, (3)
`/webinar` per-section register CTAs, (4) staff/instructor auth fixes (credentials
email, forced-fresh-login redirect, remove student-sign-in link), (5) a full
admin-authored Blog CMS publishing to GitHub with a professional feature set (design
explicitly requested as a "professional plan," not just the bare ask). A sixth
item (affiliate application "not updating") was investigate-only per explicit
instruction.
**Method:** 5 parallel Explore-agent investigations (one per area) before any code
was written, then an `EnterPlanMode` plan covering all five + the investigation,
approved by the project owner, then direct implementation. A dedicated Plan-agent
sub-task designed the Blog CMS architecture (DB-vs-GitHub split, publish mechanism,
layout presets) before it was built.
**What shipped (code, see §5/§10 for detail):** floating-icon reorder; footer
decluttered + hidden for authenticated learners; webinar CTAs; staff onboarding
email + redirect fix + login-page cleanup; a complete Blog CMS — new `BlogPost`
Prisma model + migration, `admin-blog.*`/`github-publisher.service.ts` backend
module, `packages/shared/src/blog.ts`, `AdminBlogPage`/`AdminBlogEditorPage` admin UI,
5 CSS layout presets wired through `ResourceDetailPage.tsx`/`vite.config.ts`, and
`paths-ignore` additions to `ci.yml`/`deploy.yml`.
**Verification performed:** `tsc --noEmit` + `eslint` clean on every touched file in
both workspaces; full API Jest suite green (61 suites/468 tests, incl. a new
6-test spec for the blog service covering publish-success, publish-failure-leaves-
row-untouched, unpublish, delete-draft-guard, and slug-collision checks); `npm run
build` (apps/web) succeeds. **Nothing was committed, pushed, deployed, or
live-verified in a browser this session** — see §11 for the exact manual/deploy
steps still needed and why.
**Decisions made (security/architecture-reviewed in-session, see §10):**
GitHub-Contents-API-direct over an Actions-workflow relay; hand-rolled REST client
over the Octokit SDK; cover images hosted permanently in Supabase Storage rather
than committed into the repo (confirmed `assetUrl()` already supports external
URLs unchanged); 5 curated CSS presets rather than any form of admin-authored CSS.
**Unresolved issues:** the 4 manual/deploy steps in §11 (GITHUB_TOKEN, blog-media
bucket, commit+push, live verification) are the only things between this and a
working feature in production. Scheduled publishing and draft autosave were
deliberately scoped as fast-follows, not left half-built (no partial/stubbed code
for either exists).
**Next action:** see §11.

### 2026-10-13 — Project memory audit (this document)
**Objective:** create `memory.md` + `CLAUDE.md` memory-loading instruction per an
explicit, detailed task spec, so a fresh session (any account) can resume without
re-deriving project state from scratch.
**Method:** direct inspection (git log/status, `README.md`, `docs/README.md`,
`docs/production-readiness.html`, design tokens, `.github/workflows/*`, package.json
scripts/deps, `apps/web/src/lib/storage.ts`) + 3 parallel Explore subagents covering
(1) Prisma schema + env vars, (2) full route inventory with guards, (3) backend
module inventory + TODO/FIXME grep + recent commit shape. All findings
cross-verified against actual source, not assumed.
**Major findings:** repo already has an actively-maintained, largely-accurate
`README.md` (used as the architectural skeleton here); `docs/production-readiness.html`
is stale (12 Sept 2026) and should not be trusted as current; two specific `README.md`
bullets (Quill, File storage) are now behind this session's own earlier work;
`apps/web/src/lib/storage.ts` has confirmed dead code; zero inline TODO/FIXME markers
exist anywhere in the codebase; zero frontend test files exist.
**Verification performed:** all claims above are sourced from direct file reads or
subagent reads of actual files — no claim in this document was invented. Did not run
the full test suite fresh during this specific audit turn (relied on this session's
earlier-confirmed 462-passing result, noted as such in §9 rather than re-claimed as
freshly re-run).
**Unresolved issues:** none introduced; several pre-existing gaps documented in §12.
**Next action:** see §11.
**Same-day follow-up:** the P2 dead-code item (`uploadFile()`/`removeFile()` in
`apps/web/src/lib/storage.ts`) was picked up and deleted immediately after this audit
landed — verified unused via a fresh grep, `tsc`/`eslint` clean afterward. §5, §9,
§11, §12, and §13 updated in place to reflect this rather than left to go stale.
Not yet committed/pushed as of this entry — see §11 for current working-tree state
when resuming.

### 2026-10-10 to 2026-10-11 — Avatar/assignment upload fix, portal refetch fix, Quill site-wide promotion
**Objective:** fix a reported bug ("profile picture upload doesn't work"), which led
to diagnosing a Supabase Storage platform-level RLS bug, implementing a
backend-mediated upload architecture, fixing a related CI regression (twice, for two
different missing Supabase-only objects), fixing an unrelated-but-discovered portal
UX bug (full-page blank on every background refetch), and then — on explicit user
request — promoting Quill from a single-course-page widget to a site-wide assistant
with persistent chat history.
**Files/features changed:** see §5, §10, §13 for full detail — this is the bulk of
what's documented in this memory file's "verified this session" claims.
**Decisions:** backend-mediated uploads (security-reviewed with the user before
implementing); `QuillProvider` at `App.tsx` root not `Layout.tsx`; Quill history is
localStorage-only.
**Verification performed:** full Jest suite, tsc, eslint, production builds (both
workspaces), live Claude-in-Chrome verification against production for every
user-facing change, CI/Deploy watched green via `gh run watch` after every push.
**Unresolved issues:** the two README staleness spots, the dead code in
`storage.ts` — both carried into this document's §12 backlog, not fixed in that
session (out of scope at the time).
**Next action (at the time):** none pending — all objectives for that session were
completed and verified; this document itself is the direct continuation.
