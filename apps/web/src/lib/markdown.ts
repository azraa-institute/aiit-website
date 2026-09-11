/**
 * Dependency-free article renderer for AIIT Resources. Post bodies in
 * `src/content/posts/*.md` are Markdown; a body pasted as HTML (e.g. a
 * WordPress export) is detected and passed through instead. Either way the
 * output is sanitised HTML for a `.prose` container.
 *
 * Deliberately not spec-complete — it covers only what the explainer posts
 * use: headings, paragraphs, flat lists, blockquotes, links, emphasis,
 * inline code, code fences, images and rules.
 */

import { assetUrl } from './assetUrl';

const HTML_BLOCK_RE =
  /<(?:p|h[1-6]|ul|ol|li|blockquote|figure|figcaption|img|table|thead|tbody|tr|td|th|div|section|article|aside|pre|hr)\b/i;

/** Render a post body (Markdown or HTML) to a sanitised HTML string.
 *  Every <h2>/<h3> gets a stable `id` so a table of contents can link to it. */
export function articleToHtml(raw: string): string {
  const src = stripComments(raw).trim();
  if (!src) return '';
  // Markdown output escapes all raw HTML already; only the pass-through
  // path (a body pasted as HTML) needs the scrub.
  const html = looksLikeHtml(src) ? sanitiseHtml(src) : markdownToHtml(src);
  return versionAssets(addHeadingIds(dropInlinePromos(html)));
}

/** Append the static-asset version tag to in-body `/assets/...` references
 *  (images, video sources / posters) so a replaced file re-fetches once. */
function versionAssets(html: string): string {
  return html.replace(
    /(<(?:img|source|video)\b[^>]*?\s(?:src|poster)=")(\/assets\/[^"]+)(")/gi,
    (_m, pre: string, url: string, post: string) => pre + assetUrl(url) + post,
  );
}

/**
 * Remove the parenthetical "(check out our courses…)" asides that the
 * imported articles drop into the body — they break the reading flow and
 * the page already has a course link / newsletter after the article. Only
 * fully-parenthetical paragraphs that link to /courses or /register are
 * touched; genuine prose is left alone.
 */
function dropInlinePromos(html: string): string {
  return html.replace(/<p>([\s\S]*?)<\/p>/gi, (whole, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').trim();
    const links = /href="(?:https?:\/\/(?:www\.)?aiit\.network)?\/(?:courses|register)\b/i.test(inner);
    const parenthetical = /^\(.*\)$/s.test(text);
    return links && parenthetical ? '' : whole;
  });
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** The <h2>/<h3> outline of a rendered article, for a table of contents. */
export function extractHeadings(html: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[3].replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').trim();
    if (text) out.push({ id: m[2], text, level: Number(m[1]) as 2 | 3 });
  }
  return out;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z#0-9]+;/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<h([23])(\b[^>]*)>([\s\S]*?)<\/h\1>/gi,
    (whole, level: string, attrs: string, inner: string) => {
      if (/\bid=/.test(attrs)) return whole;
      const base = slugifyHeading(inner) || 'section';
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n + 1}`;
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    },
  );
}

/** Estimated reading time in minutes from the body text (~200 wpm). */
export function articleReadMinutes(raw: string): number {
  const words = plainText(raw).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Body reduced to readable words — for word counts and search indexes. */
export function plainText(raw: string): string {
  return stripComments(raw)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */

function stripComments(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

function looksLikeHtml(s: string): boolean {
  return HTML_BLOCK_RE.test(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Inline Markdown → HTML, run on already-block-split text. */
function inline(text: string): string {
  let out = escapeHtml(text);
  // images first (before links — same bracket syntax with a leading !)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt: string, src: string, title?: string) =>
      `<img src="${attr(src)}" alt="${attr(alt)}"${title ? ` title="${attr(title)}"` : ''} loading="lazy" decoding="async">`,
  );
  // links
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, label: string, href: string) => {
      const external = /^https?:\/\//i.test(href) && !href.includes('aiit.network');
      return `<a href="${attr(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    },
  );
  // inline code
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');
  return out;
}

function attr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  const isBlank = (s: string) => s.trim() === '';

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i++;
      continue;
    }

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(
        `<pre><code${fence[1] ? ` class="language-${fence[1]}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 6);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // blockquote (consecutive `>` lines)
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote><p>${inline(buf.join(' ').trim())}</p></blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*[-*+]\s+/, '').trim()));
        i++;
      }
      out.push(`<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*\d+[.)]\s+/, '').trim()));
        i++;
      }
      out.push(`<ol>${items.map((t) => `<li>${t}</li>`).join('')}</ol>`);
      continue;
    }

    // standalone image → figure
    const imgOnly = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (imgOnly) {
      const cap = imgOnly[3] || imgOnly[1];
      out.push(
        `<figure><img src="${attr(imgOnly[2])}" alt="${attr(imgOnly[1])}" loading="lazy" decoding="async">${
          cap ? `<figcaption>${inline(cap)}</figcaption>` : ''
        }</figure>`,
      );
      i++;
      continue;
    }

    // paragraph — gather until blank / next block
    const buf: string[] = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^(#{1,6}\s|\s*>|\s*[-*+]\s+|\s*\d+[.)]\s+|```)/.test(lines[i]) &&
      !/^\s*([-*_])\s*(\1\s*){2,}$/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('\n');
}

/**
 * Defence-in-depth scrub for the HTML path (first-party content, so this is
 * a safety net, not a trust boundary): drop scripts/styles/embeds, inline
 * event handlers and javascript: URLs.
 */
function sanitiseHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
}
