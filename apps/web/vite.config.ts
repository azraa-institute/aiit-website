import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Blog index — parses frontmatter (only) from src/content/posts/*.md at build
 * time and exposes it as `virtual:aiit-blog`. The article BODIES stay out of
 * this module and are code-split per post (loaded via import.meta.glob in
 * src/data/resources.ts), so the post list is cheap everywhere it's used
 * (homepage teaser, global search) while full text only loads on an article.
 */
function aiitBlog(): Plugin {
  const virtualId = 'virtual:aiit-blog';
  const resolvedId = '\0' + virtualId;
  const dir = fileURLToPath(new URL('./src/content/posts', import.meta.url));

  const parse = (raw: string) => {
    const text = raw.replace(/^﻿/, '');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {} as Record<string, unknown>, body: text };
    const data: Record<string, unknown> = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.trim().match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv || line.trim().startsWith('#')) continue;
      let v = kv[2].trim();
      if (v === 'true' || v === 'false') data[kv[1]] = v === 'true';
      else if (/^\[.*\]$/.test(v))
        data[kv[1]] = v
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      else {
        v = v.replace(/^["']|["']$/g, '');
        data[kv[1]] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
      }
    }
    return { data, body: m[2] };
  };

  const build = () => {
    const posts = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const { data, body } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const slug = String(data.slug || f.replace(/\.md$/, ''));
        const words = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/[#>*_`~|[\]()-]+/g, ' ')
          .split(/\s+/)
          .filter(Boolean).length;
        return {
          id: slug,
          slug,
          title: String(data.title ?? ''),
          category: String(data.category ?? ''),
          excerpt: String(data.excerpt ?? ''),
          author: String(data.author ?? 'AIIT Network'),
          readMinutes:
            typeof data.readMinutes === 'number' && data.readMinutes > 0
              ? data.readMinutes
              : Math.max(1, Math.round(words / 200)),
          publishedAt: String(data.publishedAt ?? ''),
          image: String(data.image ?? ''),
          image2: data.image2 ? String(data.image2) : undefined,
          featured: data.featured === true,
          tags: Array.isArray(data.tags) ? data.tags : [],
          source: data.source ? String(data.source) : undefined,
          words,
        };
      })
      .filter((p) => p.slug && p.title && p.category)
      .sort((a, b) =>
        a.publishedAt !== b.publishedAt
          ? a.publishedAt < b.publishedAt
            ? 1
            : -1
          : a.title.localeCompare(b.title),
      );
    return `export const posts = ${JSON.stringify(posts)};`;
  };

  return {
    name: 'aiit-blog',
    resolveId: (id) => (id === virtualId ? resolvedId : null),
    load: (id) => (id === resolvedId ? build() : null),
    configureServer(server) {
      server.watcher.add(dir);
      const bust = (file: string) => {
        if (!file.endsWith('.md') || !file.replace(/\\/g, '/').includes('/content/posts/')) return;
        const mod = server.moduleGraph.getModuleById(resolvedId);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', bust);
      server.watcher.on('change', bust);
      server.watcher.on('unlink', bust);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), aiitBlog()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
