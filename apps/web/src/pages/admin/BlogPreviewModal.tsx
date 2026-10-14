import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BlogLayoutPreset } from '@aiit/shared';
import { Plate } from '@/components/primitives/Plate';
import { articleToHtml } from '@/lib/markdown';
import { shortCategory } from '@/lib/resourceEditorial';
import { formatDate, pluralize } from '@/lib/format';
import '@/pages/resource-detail.css';
import './blog-preview-modal.css';

const shortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

export interface BlogPreviewData {
  title: string;
  category: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string | null;
  coverImage2Url: string | null;
  readMinutes: number | null;
  preset: BlogLayoutPreset;
  authorName: string;
}

/**
 * A full "page" preview, not just the raw Markdown dumped under the editor
 * -- reuses the exact same article-hero/article-body markup and
 * resource-detail.css rules the live /resources/:slug page renders, so
 * typography, the cover image treatment and the chosen layout preset all
 * look the way they actually will once published. Portaled to <body>, same
 * pattern as QuillChatPanel's modal.
 */
export function BlogPreviewModal({ data, onClose }: { data: BlogPreviewData; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const html = articleToHtml(data.bodyMarkdown || '*Nothing written yet.*');
  const words = data.bodyMarkdown.split(/\s+/).filter(Boolean).length;
  const readMinutes = data.readMinutes && data.readMinutes > 0 ? data.readMinutes : Math.max(1, Math.round(words / 200));

  return createPortal(
    <div className="blog-preview__backdrop" onClick={onClose}>
      <div className="blog-preview__panel" role="dialog" aria-modal="true" aria-label="Post preview" onClick={(e) => e.stopPropagation()}>
        <div className="blog-preview__bar">
          <span className="blog-preview__badge">
            <span className="blog-preview__badge-dot" aria-hidden="true" />
            Preview
          </span>
          <span className="blog-preview__hint">This isn&apos;t the live page yet</span>
          <button type="button" className="blog-preview__close" aria-label="Close preview" ref={closeRef} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 15 15" aria-hidden="true">
              <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="blog-preview__scroll">
          <article className={`resource-article resource-article--${data.preset}`}>
            <div className="article-read">
              <header className="article-hero container">
                <p className="res-tag article-hero__field">{data.category ? shortCategory(data.category) : 'Uncategorized'}</p>
                <h1 className="article-hero__title">{data.title || 'Untitled post'}</h1>
                <p className="article-hero__deck">{data.excerpt || 'No excerpt yet.'}</p>
                <p className="article-hero__meta">
                  <span>{shortDate(new Date().toISOString())}</span>
                  <span className="res-dot" aria-hidden="true" />
                  <span>{pluralize(readMinutes, 'min')} read</span>
                  <span className="res-dot" aria-hidden="true" />
                  <span>{data.authorName}</span>
                </p>
              </header>

              {data.coverImageUrl ? (
                <figure className={`article-hero__figure container${data.coverImage2Url ? ' article-hero__figure--pair' : ''}`}>
                  <Plate source={data.coverImageUrl} seed="blog-preview" fit="natural" className="article-hero__image" alt="" />
                  {data.coverImage2Url ? (
                    <Plate source={data.coverImage2Url} seed="blog-preview-2" fit="natural" className="article-hero__image" alt="" />
                  ) : null}
                </figure>
              ) : null}

              <div className="article-layout container">
                <div className="article-body prose">
                  <div className="article-copy" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>,
    document.body,
  );
}
