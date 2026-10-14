import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AdminBlogPost, BlogLayoutPreset, BlogPostInput } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { articleToHtml } from '@/lib/markdown';
import { formatWhen, useAdminFetch } from './adminData';
import '@/pages/resource-detail.css';

const PRESET_INFO: Record<BlogLayoutPreset, { label: string; description: string }> = {
  editorial: { label: 'Editorial (default)', description: 'Generous line-length, serif headings, large cover image.' },
  tutorial: { label: 'Tutorial', description: 'Numbered steps, more room around code blocks, emphasized TOC.' },
  'news-brief': { label: 'News brief', description: 'Compact hero, tighter rhythm -- short/time-sensitive posts.' },
  spotlight: { label: 'Spotlight', description: 'Large pull-quotes, byline promoted -- interviews/features.' },
  'data-deep-dive': { label: 'Data deep-dive', description: 'Wider column for tables/charts, monospace stat callouts.' },
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

  const previewHtml = useMemo(() => (showPreview ? articleToHtml(form.bodyMarkdown) : ''), [showPreview, form.bodyMarkdown]);

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

  async function handleCoverUpload(e: ChangeEvent<HTMLInputElement>, field: 'coverImageUrl' | 'coverImage2Url') {
    const file = e.target.files?.[0];
    e.target.value = '';
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
              required
              rows={16}
              value={form.bodyMarkdown}
              onChange={(e) => update('bodyMarkdown', e.target.value)}
            />
          </label>
          <div className="adm-field adm-field--wide">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
            {showPreview ? (
              <div className={`article-body prose resource-article resource-article--${form.preset}`}>
                <div className="article-copy" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : null}
          </div>
          <label className="adm-field adm-field--wide">
            <span>Tags (comma-separated)</span>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="AI Tools, Careers" />
          </label>
        </div>

        <h2 className="adm-h2">Media</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Cover image</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleCoverUpload(e, 'coverImageUrl')} />
            {form.coverImageUrl ? <img src={form.coverImageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} /> : null}
          </label>
          <label className="adm-field">
            <span>Second image (optional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleCoverUpload(e, 'coverImage2Url')} />
            {form.coverImage2Url ? <img src={form.coverImage2Url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} /> : null}
          </label>
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
        </div>
      </form>
    </div>
  );
}
