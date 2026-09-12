<div align="center">

# AIIT — Azraa Institute of Information Technology

**AIIT**, an international online technology institute —
[aiit.network](https://aiit.network) reimagined as a calm, editorial,
future-tech learning platform, with a real learner portal behind it.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-6-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
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
| Routing | React Router 6 — lazy-loaded route chunks |
| SEO | `react-helmet-async` — per-page metadata + JSON-LD |
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
| `/courses` · `/courses/:slug` | Course discovery (search / filter / sort) · course detail |
| `/resources` · `/resources/:slug` | AIIT Resources index · article |
| `/webinar` | Live at AIIT — featured webinar + events |
| `/faqs` | Help centre (searchable, categorised) |
| `/instructors` · `/why-join` · `/aiit-blueprint` · `/affiliate` | Editorial pages |
| `/shop` · `/shop/:slug` | Merchandise catalogue · product detail |
| `/contact` | Contact form |
| `/login` · `/register` · `/forgot-password` | Auth |
| `/portal` · `/portal/*` | Learner portal — dashboard, courses, certificates, assignments, resources, webinars, profile, notifications, settings |
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
scaffold. Live modules:

- **Auth** — Supabase Auth (email/password, magic link, TOTP 2FA). API routes
  verify the caller's JWT against Supabase's JWKS endpoint (`JwtGuard`), then
  look up the app-level role from `profiles` — never trusts the JWT's own role
  claim.
- **Catalogue** — course/domain/category data, location-based currency pricing.
- **Learner portal** — `Enrollment`, `Assignment` + `AssignmentSubmission`,
  `Certificate`, `Notification`. Self-enrollment is open for free courses only
  (no payment integration exists); grading and certificate issuance are real
  `@Roles('admin')`-gated endpoints with no admin UI yet — callable directly
  (curl/Postman) until one is built.
- **Profile** — `GET/PATCH /me`, `PATCH /me/preferences`, `DELETE /me` (soft
  deletion request).

**Not yet wired to the backend:**

- The **contact, newsletter, and webinar-registration forms** still validate
  and show a success state locally but don't submit anywhere
  (`ContactPage.tsx`, `NewsletterForm.tsx`, `WebinarPage.tsx`).
- **Apple sign-in** is not built — it needs a paid Apple Developer Program
  membership ($99/yr) and a separate setup (Services ID, private key, JWT
  client secret) that hasn't started; the button was removed rather than left
  showing a permanent "not configured" error. Google sign-in is real and
  configured (Google Cloud project `aiit-auth`, OAuth client, wired into
  Supabase).
- **Avatar upload and assignment file attachments** need two Supabase Storage
  buckets (`avatars`, `submissions`) that haven't been created yet; everything
  else in the portal works without them.
- **Payments** — no payment system exists in this codebase. Paid/subscription
  courses show as informational-only on the course page; there is no
  Payment Methods section anywhere in the portal.

---

<div align="center">
<sub>© Azraa Institute of Information Technology · Private and proprietary</sub>
</div>
