<div align="center">

# AIIT — Azraa Institute of Information Technology

The web front-end for **AIIT**, an international online technology institute —
[aiit.network](https://aiit.network) reimagined as a calm, editorial,
future-tech learning platform.

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
| Hosting | Vercel (static SPA) |

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
is the NestJS backend (Phase 0 foundations — a scaffold with a health check, not
yet wired to real business logic), `packages/shared` holds types shared by both.
`npm install`/`npm run dev`/`build`/`lint`/`typecheck` at the repo root operate
across the whole workspace; `npm run dev:api` starts the API alone.

## Project structure

```
azraa-aiit/
├── apps/web/        the frontend above (moved from the former repo-root src/)
├── apps/api/        the NestJS API — see apps/api/README or the backend plan
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
│   └── portal/         learner portal shell
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

`vercel.json` configures SPA rewrites and asset caching. Any static host works —
serve `dist/` with a catch-all rewrite to `/index.html`.

## Backend status

The front-end is complete. The backend (`apps/api`) has its Phase 0 foundations —
a health check, CI/CD, and migration tooling — but no real business endpoints
yet. As a result:

- **Forms** (contact, newsletter, webinar, auth) validate and show success
  states but do not submit anywhere.
- **Authentication** is a client-only placeholder; the Google sign-in button is
  intentionally hidden until an OAuth provider is wired up.
- **The learner portal** renders fully designed *empty states* from an empty
  record (`src/pages/portal/learnerData.ts`) — it never displays fabricated
  progress, grades or certificates.

---

<div align="center">
<sub>© Azraa Institute of Information Technology · Private and proprietary</sub>
</div>
