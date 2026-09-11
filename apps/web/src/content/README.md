# Blog content — `posts/`

`posts/*.md` is the **single source of truth** for AIIT Resources (the blog).
One file per post. `src/data/resources.ts` loads and parses this folder at build
time — there is no CMS, no database, no external API. WordPress is retired.

## Add or edit a post

Create / edit `posts/<slug>.md`:

```md
---
title: "How Networking Actually Works"
slug: how-networking-actually-works
category: Tech Explainers
publishedAt: 2026-09-01
image: /assets/blog/how-networking-actually-works.jpg
excerpt: "A plain-English tour of packets, routers and the path your data takes."
featured: false
tags: ["Networking", "Cisco CCNA"]
source: https://aiit.network/how-networking-actually-works/
---

Your first paragraph becomes the article lead-in.

## A heading

Body is **Markdown** — headings, lists, `> quotes`, [links](/courses), images,
`code`, fenced code blocks. You can also paste raw **HTML** straight from a
WordPress export; it's detected and rendered as-is (scripts/handlers stripped).
```

### Frontmatter

| key           | required | notes                                                        |
| ------------- | -------- | ------------------------------------------------------------ |
| `title`       | yes      |                                                            |
| `slug`        | yes      | the URL is `/resources/<slug>`; also the filename           |
| `category`    | yes      | drives the editorial sections — reuse an existing one       |
| `publishedAt` | yes      | `YYYY-MM-DD`; sorts the archive newest-first                 |
| `image`       | yes      | `/assets/blog/…`                                            |
| `excerpt`     | yes      | hero deck + cards + `<meta description>`                     |
| `featured`    | no       | `true` promotes it to the index lead / secondary slots      |
| `tags`        | no       | `["a", "b"]` — used by site search                          |
| `author`      | no       | defaults to `AIIT Network`                                  |
| `readMinutes` | no       | number; defaults to an estimate from the body (~200 wpm)    |
| `source`      | no       | original URL — shown as a small "originally published" note |

## How it loads

`vite.config.ts` (`virtual:aiit-blog`) parses the **frontmatter** of every file
at build time into the post list used across the site. Each **body** is
code-split into its own chunk and fetched only when its article page opens
(`loadResourceBody` in `src/data/resources.ts`), rendered by `src/lib/markdown.ts`.

A post whose body is under ~90 words shows a "Full article coming soon" note
instead — handy while drafting.

## Migration

All 29 posts were imported from the aiit.network WordPress on 8 Sep 2026 via the
WP REST API (`/wp-json/wp/v2/posts`): full body, editor cruft stripped, entities
decoded, internal links made relative, the one inline video + one image pulled
into `public/assets/blog/`, `publishedAt` / `readMinutes` / `excerpt` refreshed
from the real articles. WordPress is no longer referenced anywhere.
