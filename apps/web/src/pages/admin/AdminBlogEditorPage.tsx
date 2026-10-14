import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AdminBlogPost, BlogLayoutPreset, BlogMediaUploadResult, BlogPostInput } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { looksLikeHtml } from '@/lib/markdown';
import { formatWhen, useAdminFetch } from './adminData';
import { BlogPreviewModal } from './BlogPreviewModal';

interface MediaItem extends BlogMediaUploadResult {
  name: string;
}

const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime';

/** Matches markdown.ts's own `[audio: URL]`/`[video: URL]` shorthand and the Markdown image fallback -- see its doc comment for why raw <audio>/<video> tags aren't used in a Markdown-mode body. */
function mediaSnippet(item: MediaItem, bodyIsHtml: boolean): string {
  if (item.kind === 'image') {
    return bodyIsHtml ? `<figure><img src="${item.url}" alt=""></figure>` : `![](${item.url})`;
  }
  return bodyIsHtml
    ? `<figure class="article-media article-media--${item.kind}"><${item.kind} controls src="${item.url}"></${item.kind}></figure>`
    : `[${item.kind}: ${item.url}]`;
}

/**
 * A native <input type="file"> can't be restyled into a normal-looking
 * button -- its internal "Choose File" control + filename text are
 * browser-native and don't reliably center/align the way author CSS
 * expects (confirmed: they stayed pinned to the top of the box even with
 * `display:flex; align-items:center` on the input itself). Standard fix:
 * keep the real input in the DOM (visually-hidden, so it's still
 * focusable/accessible) and trigger it from a normal styled button.
 */
function FilePickerButton({
  label,
  accept,
  multiple,
  disabled,
  onFiles,
  children,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList) => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button type="button" className="adm-btn adm-btn--ghost" disabled={disabled} onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        className="visually-hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children}
    </div>
  );
}

const PRESET_INFO: Record<BlogLayoutPreset, { label: string; description: string }> = {
  editorial: { label: 'Editorial (default)', description: 'Generous line-length, serif headings, large cover image.' },
  tutorial: { label: 'Tutorial', description: 'Numbered steps, more room around code blocks, emphasized TOC.' },
  'news-brief': { label: 'News brief', description: 'Compact hero, tighter rhythm -- short/time-sensitive posts.' },
  spotlight: { label: 'Spotlight', description: 'Large pull-quotes, byline promoted -- interviews/features.' },
  'data-deep-dive': { label: 'Data deep-dive', description: 'Wider column for tables/charts, monospace stat callouts.' },
  listicle: { label: 'Listicle', description: 'Numbered circular badges per section -- "Top N" / ranked posts.' },
  'case-study': { label: 'Case study', description: 'Bordered result/metric callout boxes -- project outcomes, client stories.' },
  'visual-essay': { label: 'Visual essay', description: 'Image-forward: bigger figures, quieter captions, wider column.' },
  magazine: { label: 'Magazine', description: 'Drop cap on the opening paragraph -- a long-form feature read.' },
  'video-feature': { label: 'Video feature', description: 'Built around an embedded video, given cinematic framing.' },
};
const PRESETS = Object.keys(PRESET_INFO) as BlogLayoutPreset[];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

const EMPTY: BlogPostInput = {
  slug: '',
  title: '',
  category: '',
  excerpt: '',
  bodyMarkdown: '',
  coverImageUrl: null,
  coverImage2Url: null,
  tags: [],
  readMinutes: null,
  featured: false,
  preset: 'editorial',
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  scheduledAt: null,
};

function toForm(p: AdminBlogPost): BlogPostInput {
  return {
    slug: p.slug,
    title: p.title,
    category: p.category,
    excerpt: p.excerpt,
    bodyMarkdown: p.bodyMarkdown,
    coverImageUrl: p.coverImageUrl,
    coverImage2Url: p.coverImage2Url,
    tags: p.tags,
    readMinutes: p.readMinutes,
    featured: p.featured,
    preset: p.preset,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImageUrl: p.ogImageUrl,
    scheduledAt: p.scheduledAt,
  };
}

export default function AdminBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const existing = useAdminFetch<AdminBlogPost>(isNew ? null : `/admin/blog/${id}`);

  const [form, setForm] = useState<BlogPostInput>(EMPTY);
  const [tagsText, setTagsText] = useState('');
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [slugTaken, setSlugTaken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string>();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (existing.status === 'ready') {
      setForm(toForm(existing.data));
      setTagsText(existing.data.tags.join(', '));
      setPost(existing.data);
    }
  }, [existing]);

  function update<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setNotice(undefined);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(title: string) {
    update('title', title);
    if (!slugTouched) update('slug', slugify(title));
  }

  async function onSlugBlur() {
    if (!form.slug) return;
    try {
      const res = await apiFetch<{ available: boolean }>(
        `/admin/blog/check-slug?slug=${encodeURIComponent(form.slug)}${post ? `&excludeId=${post.id}` : ''}`,
      );
      setSlugTaken(!res.available);
    } catch {
      // Non-fatal -- the real uniqueness check still happens server-side on save.
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (post) {
        const updated = await apiFetch<AdminBlogPost>(`/admin/blog/${post.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, tags }),
        });
        setPost(updated);
        setNotice('Draft saved.');
      } else {
        const created = await apiFetch<AdminBlogPost>('/admin/blog', { method: 'POST', body: JSON.stringify({ ...form, tags }) });
        navigate(`/admin/blog/${created.id}`, { replace: true });
        setPost(created);
        setNotice('Draft created.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this post.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!post) return;
    setPublishing(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await apiFetch<{ post: AdminBlogPost; commitUrl: string }>(`/admin/blog/${post.id}/publish`, { method: 'POST' });
      setPost(result.post);
      setNotice(`Published. Commit: ${result.commitUrl}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish this post -- it has not been changed.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!post) return;
    if (!window.confirm('Remove this post from the live site? The page will stop working immediately.')) return;
    setPublishing(true);
    setError(undefined);
    try {
      const updated = await apiFetch<AdminBlogPost>(`/admin/blog/${post.id}/unpublish`, { method: 'POST' });
      setPost(updated);
      setNotice('Unpublished -- the file has been removed from the live site.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unpublish this post.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm('Delete this draft permanently?')) return;
    try {
      await apiFetch(`/admin/blog/${post.id}`, { method: 'DELETE' });
      navigate('/admin/blog', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this draft.');
    }
  }

  async function handleCoverUpload(files: FileList, field: 'coverImageUrl' | 'coverImage2Url') {
    const file = files[0];
    if (!file) return;
    setError(undefined);
    try {
      const body = new FormData();
      body.append('file', file);
      const { url } = await apiFetch<{ url: string }>('/admin/blog/cover-image', { method: 'POST', body });
      update(field, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that image.');
    }
  }

  /** The media library -- as many files as the admin picks, uploaded one at a time so a failure partway leaves the rest already added. */
  async function handleMediaFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setMediaError(undefined);
    setMediaUploading(true);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        const result = await apiFetch<BlogMediaUploadResult>('/admin/blog/media', { method: 'POST', body });
        setMediaItems((cur) => [...cur, { ...result, name: file.name }]);
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Could not upload one of those files.');
    } finally {
      setMediaUploading(false);
    }
  }

  /** Inserts at the textarea's last known cursor position, matching the body's current flavor (raw HTML vs Markdown) -- see mediaSnippet()'s doc comment. */
  function insertMedia(item: MediaItem) {
    const ta = bodyRef.current;
    const pos = ta?.selectionStart ?? form.bodyMarkdown.length;
    const snippet = `\n\n${mediaSnippet(item, looksLikeHtml(form.bodyMarkdown))}\n\n`;
    const next = form.bodyMarkdown.slice(0, pos) + snippet + form.bodyMarkdown.slice(pos);
    update('bodyMarkdown', next);
    requestAnimationFrame(() => {
      if (!ta) return;
      const newPos = pos + snippet.length;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    });
  }

  if (!isNew && existing.status === 'loading') return <p className="adm-muted">Loading…</p>;
  if (!isNew && existing.status === 'error') return <p className="adm-error" role="alert">{existing.message}</p>;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">{post ? post.title || 'Edit post' : 'New post'}</h1>
          {post ? (
            <p className="adm-intro">
              <span className={`adm-status adm-status--b-${post.status}`}>{post.status}</span>
              {post.publishedAt ? ` · published ${formatWhen(post.publishedAt)}` : ''}
              {post.filePath ? ` · ${post.filePath}` : ''}
            </p>
          ) : null}
        </div>
        <Link to="/admin/blog" className="adm-btn adm-btn--ghost">
          Back to posts
        </Link>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        <h2 className="adm-h2">Content</h2>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Title</span>
            <input required minLength={3} maxLength={200} value={form.title} onChange={(e) => onTitleChange(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Slug</span>
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update('slug', e.target.value);
              }}
              onBlur={onSlugBlur}
            />
            {slugTaken ? <span className="adm-error">That slug is already in use.</span> : null}
          </label>
          <label className="adm-field">
            <span>Category</span>
            <input required minLength={2} maxLength={80} value={form.category} onChange={(e) => update('category', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Excerpt</span>
            <textarea required minLength={10} maxLength={400} rows={3} value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Body (Markdown, or pasted HTML)</span>
            <textarea
              ref={bodyRef}
              required
              rows={16}
              value={form.bodyMarkdown}
              onChange={(e) => update('bodyMarkdown', e.target.value)}
            />
          </label>
          <div className="adm-field adm-field--wide">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowPreview(true)}>
              Preview
            </button>
          </div>
          <label className="adm-field adm-field--wide">
            <span>Tags (comma-separated)</span>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="AI Tools, Careers" />
          </label>
        </div>

        <h2 className="adm-h2">Media</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <span>Cover image</span>
            <FilePickerButton
              label={form.coverImageUrl ? 'Replace image' : 'Choose image'}
              accept="image/jpeg,image/png,image/webp"
              onFiles={(files) => handleCoverUpload(files, 'coverImageUrl')}
            />
            {form.coverImageUrl ? <img src={form.coverImageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} /> : null}
          </div>
          <div className="adm-field">
            <span>Second image (optional)</span>
            <FilePickerButton
              label={form.coverImage2Url ? 'Replace image' : 'Choose image'}
              accept="image/jpeg,image/png,image/webp"
              onFiles={(files) => handleCoverUpload(files, 'coverImage2Url')}
            />
            {form.coverImage2Url ? <img src={form.coverImage2Url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} /> : null}
          </div>
          <div className="adm-field adm-field--wide">
            <span>Media library -- insert into the body at your cursor</span>
            <FilePickerButton
              label={mediaUploading ? 'Uploading…' : 'Choose images/audio/video'}
              accept={MEDIA_ACCEPT}
              multiple
              disabled={mediaUploading}
              onFiles={handleMediaFiles}
            />
            {mediaError ? <p className="adm-error" role="alert">{mediaError}</p> : null}
            {mediaItems.length > 0 ? (
              <ul className="adm-list" role="list">
                {mediaItems.map((item, idx) => (
                  <li className="adm-card" key={`${item.url}-${idx}`}>
                    <div className="adm-card__main">
                      {item.kind === 'image' ? (
                        <img src={item.url} alt="" style={{ maxWidth: 80, maxHeight: 80, borderRadius: 6 }} />
                      ) : (
                        <span className="adm-tag adm-tag--creator">{item.kind}</span>
                      )}
                      <span className="adm-card__meta">{item.name}</span>
                    </div>
                    <div className="adm-card__actions">
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => insertMedia(item)}>
                        Insert
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <h2 className="adm-h2">SEO &amp; metadata</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>SEO title (optional)</span>
            <input maxLength={70} value={form.seoTitle ?? ''} onChange={(e) => update('seoTitle', e.target.value || null)} />
          </label>
          <label className="adm-field">
            <span>Read time override, minutes (optional)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={form.readMinutes ?? ''}
              onChange={(e) => update('readMinutes', e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Meta description (optional)</span>
            <textarea maxLength={200} rows={2} value={form.seoDescription ?? ''} onChange={(e) => update('seoDescription', e.target.value || null)} />
          </label>
        </div>

        <h2 className="adm-h2">Publishing</h2>
        <div className="adm-grid">
          <fieldset className="adm-field adm-field--wide">
            <legend>Layout preset</legend>
            <div className="adm-checks">
              {PRESETS.map((p) => (
                <label key={p} className="adm-check">
                  <input type="radio" name="preset" checked={form.preset === p} onChange={() => update('preset', p)} />
                  <span>
                    <strong>{PRESET_INFO[p].label}</strong> — {PRESET_INFO[p].description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="adm-check">
            <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
            <span>Featured on the Resources index</span>
          </label>
        </div>

        {error ? <p className="adm-error" role="alert">{error}</p> : null}
        {notice ? <p className="adm-notice" role="status">{notice}</p> : null}

        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || slugTaken}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {post && post.status !== 'published' ? (
            <button type="button" className="adm-btn adm-btn--primary" disabled={publishing} onClick={handlePublish}>
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}
          {post && post.status === 'published' ? (
            <>
              <button type="button" className="adm-btn adm-btn--primary" disabled={publishing} onClick={handlePublish}>
                {publishing ? 'Updating…' : 'Publish update'}
              </button>
              <button type="button" className="adm-btn adm-btn--danger" disabled={publishing} onClick={handleUnpublish}>
                Unpublish
              </button>
            </>
          ) : null}
          {post && post.status === 'draft' ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={handleDelete}>
              Delete draft
            </button>
          ) : null}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/blog')}>
            Cancel
          </button>
        </div>
      </form>

      {showPreview ? (
        <BlogPreviewModal
          data={{
            title: form.title,
            category: form.category,
            excerpt: form.excerpt,
            bodyMarkdown: form.bodyMarkdown,
            coverImageUrl: form.coverImageUrl ?? null,
            coverImage2Url: form.coverImage2Url ?? null,
            readMinutes: form.readMinutes ?? null,
            preset: form.preset,
            authorName: post?.authorName ?? 'AIIT Network',
          }}
          onClose={() => setShowPreview(false)}
        />
      ) : null}
    </div>
  );
}
