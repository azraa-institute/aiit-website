# AIIT — Azraa Institute of Information Technology

A premium, editorial front-end for AIIT, an international online technology
institute. Reimagines [aiit.network](https://aiit.network) as a future-tech
learning platform: intelligent, calm, academic, global.

Built to **scale as a system** — adding a course, technology domain, webinar,
resource, instructor or student story is a data change, never a redesign.

## Stack

- **React 18 + TypeScript + Vite**
- **React Router 6** — client routing, lazy-loaded route chunks
- **react-helmet-async** — per-page SEO + JSON-LD structured data
- Motion via **CSS + IntersectionObserver** (`prefers-reduced-motion` honoured
  everywhere). No 3D, no animation library.
- No UI framework — a hand-built design system.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run typecheck
npm run lint
```

Requires Node 18+.

## Architecture

```
src/
  styles/          tokens.css (the design system), reset, global utilities
  data/            THE CONTENT LAYER — types + seed data, decoupled from UI
    types.ts       every content shape (Course, Webinar, Resource, …)
    courses.ts     course catalogue (mirrors the live aiit.network catalogue)
    technologies.ts technology domains + course categories
    webinars.ts    webinar + "Live at AIIT" events (data-driven hero slide)
    resources.ts   loads the blog from content/posts/*.md at build time
    testimonials.ts student stories + learner regions
    faqs.ts, ecosystem.ts, hero.ts, navigation.ts, site.ts
  content/
    posts/         THE BLOG — one .md per post (frontmatter + Markdown/HTML body)
  lib/             hooks + helpers (Seo, useScrollReveal, useCountdown, format…)
  components/
    primitives/    Button, Section, Plate (procedural art), SplitStatement
    layout/        Header (transparent→sticky), MobileMenu, Footer, Layout
    common/        Countdown, Modal, Field, Stars, NewsletterForm
    course/        CourseCard, CourseFilters
    home/          the homepage section components
  pages/           one file per route; portal/ and auth/ are sub-areas
```

### The content layer

Presentation components consume the shapes in `src/data/types.ts` only. To
connect a CMS or an LMS API, replace the modules in `src/data/` — the UI does
not change.

**The blog** is self-contained: `src/content/posts/*.md` (frontmatter + a
Markdown or pasted-HTML body) is the only source of truth, loaded at build time
by `src/data/resources.ts` and rendered by `src/lib/markdown.ts`. Adding a post
is adding a file. See `src/content/README.md`.

### Imagery

`Plate` renders deterministic abstract "editorial plates" (computational
geometry, architectural grids) seeded per item — no stock photography, nothing
to license, fast. Pass a real image URL as a plate's `source` any time to swap
it in without touching callers.

## Routes

| Path | Page |
|---|---|
| `/` | Home — editorial hero slideshow, technology domains, learning ecosystem, courses, webinar, global learners, student stories, resources |
| `/about` | About + method + ecosystem + AIIT Blueprint |
| `/courses` | Course discovery — search, filters, sort (URL-synced) |
| `/courses/:slug` | Course detail — curriculum, outcomes, certification, enrol |
| `/resources`, `/resources/:slug` | AIIT Resources index + article |
| `/webinar` | Live at AIIT — featured webinar, agenda, registration, events |
| `/faqs` | Help centre — searchable, categorised |
| `/contact` | Contact form + details |
| `/login`, `/register`, `/forgot-password` | Auth |
| `/portal`, `/portal/*` | Learner portal shell (dashboard, courses, certificates, …) |
| `/privacy-policy`, `/terms`, `/affiliate` | Legal |

## Deployment

Ships with `vercel.json` (SPA rewrites + asset caching). Any static host works —
serve `dist/` with a catch-all rewrite to `/index.html`.

## Not yet wired

Forms (newsletter, contact, webinar registration, auth) validate and show
success states but post nowhere — connect them to the AIIT backend. The learner
portal uses placeholder data (`src/pages/portal/mockLearner.ts`).
