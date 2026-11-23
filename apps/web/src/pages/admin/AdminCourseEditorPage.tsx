import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  AdminCourseCategoryOption,
  AdminCourseDetail,
  AdminCourseDomainOption,
  CourseImageUploadResult,
  CourseInput,
  CourseStatus,
  CourseTechnology,
} from '@aiit/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { CATALOGUE_CATEGORIES } from '@/data/catalogueCategories';
import { useAdminFetch } from './adminData';
import { FilePickerButton } from './FilePickerButton';

const PRICING_OPTIONS: { value: CourseInput['pricing']; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'free', label: 'Free' },
  { value: 'subscription', label: 'Members / subscription only' },
];

const LEVEL_OPTIONS: CourseInput['level'][] = [
  'Absolute Beginner',
  'Beginner',
  'Beginner–Intermediate',
  'Intermediate',
  'Intermediate–Advanced',
  'Advanced',
  'All levels',
];

const BADGE_OPTIONS: { value: CourseInput['badges'][number]; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'featured', label: 'Featured' },
  { value: 'hot', label: 'Hot' },
  { value: 'special', label: 'Special' },
  { value: 'coming-soon', label: 'Coming soon' },
];

const STATUS_OPTIONS: { value: CourseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft (hidden from the public catalogue)' },
  { value: 'published', label: 'Published' },
];

// The restrained icon set course-detail pages actually render (TechIcons.tsx) --
// never a third-party brand logo, by design; kept as a hand copy here for the
// same reason CATALOGUE_CATEGORIES is its own copy rather than a shared-package
// runtime export (@aiit/shared is types-only).
const TECH_ICONS = [
  'spark', 'agents', 'chain', 'search', 'database', 'code', 'chart', 'cloud', 'network', 'router',
  'shield', 'terminal', 'chip', 'atom', 'contract', 'globe', 'megaphone', 'briefcase', 'monitor', 'chatbubble',
];
const TECH_TYPES: CourseTechnology['type'][] = ['platform', 'framework', 'tool', 'library', 'language', 'protocol', 'concept'];

const REQUIRED_COVER_WIDTH = 1600;
const REQUIRED_COVER_HEIGHT = 900;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function emptyTechnology(): CourseTechnology {
  return { name: '', type: 'tool', icon: 'spark', tier: 'core' };
}

const EMPTY: CourseInput = {
  slug: '',
  title: '',
  categoryName: '',
  domainId: null,
  catalogueCategory: CATALOGUE_CATEGORIES[0].slug as CourseInput['catalogueCategory'],
  technologies: [emptyTechnology()],
  summary: '',
  description: '',
  priceUsdCents: 0,
  priceWasUsdCents: null,
  pricing: 'paid',
  level: 'Beginner',
  durationHours: 20,
  durationLabel: '',
  badges: ['new'],
  image: '',
  outcomes: [''],
  requirements: [''],
  audience: [''],
  toolsCovered: [''],
  certification: '',
  status: 'draft',
  publishedAt: null,
};

function toForm(c: AdminCourseDetail): CourseInput {
  return {
    slug: c.slug,
    title: c.title,
    categoryName: c.categoryName,
    domainId: c.domainId,
    catalogueCategory: c.catalogueCategory ?? (CATALOGUE_CATEGORIES[0].slug as CourseInput['catalogueCategory']),
    technologies: c.technologies.length > 0 ? c.technologies : [emptyTechnology()],
    summary: c.summary,
    description: c.description,
    priceUsdCents: c.priceUsdCents,
    priceWasUsdCents: c.priceWasUsdCents,
    pricing: c.pricing,
    level: c.level,
    durationHours: c.durationHours,
    durationLabel: c.durationLabel,
    badges: c.badges,
    image: c.image,
    outcomes: c.outcomes.length > 0 ? c.outcomes : [''],
    requirements: c.requirements.length > 0 ? c.requirements : [''],
    audience: c.audience.length > 0 ? c.audience : [''],
    toolsCovered: c.toolsCovered.length > 0 ? c.toolsCovered : [''],
    certification: c.certification,
    status: c.status,
    publishedAt: c.publishedAt,
  };
}

/** Reads the file's real pixel dimensions in-browser, purely for fast feedback -- the upload endpoint re-checks this itself from the actual bytes and is the real authority (never trust a client-only check). */
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that file as an image."));
    };
    img.src = url;
  });
}

export default function AdminCourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const existing = useAdminFetch<AdminCourseDetail>(isNew ? null : `/admin/courses/${id}`);
  const categories = useAdminFetch<AdminCourseCategoryOption[]>('/admin/courses/categories');
  const domains = useAdminFetch<AdminCourseDomainOption[]>('/admin/courses/domains');

  const [form, setForm] = useState<CourseInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (existing.status === 'ready') {
      setForm(toForm(existing.data));
      setCourse(existing.data);
    }
  }, [existing]);

  function update<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setNotice(undefined);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(title: string) {
    update('title', title);
    if (!slugTouched) update('slug', slugify(title));
  }

  function updateTechnology(index: number, item: CourseTechnology) {
    const next = [...form.technologies];
    next[index] = item;
    update('technologies', next);
  }

  async function handleCoverUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(undefined);
    try {
      const dims = await readImageDimensions(file);
      if (dims.width !== REQUIRED_COVER_WIDTH || dims.height !== REQUIRED_COVER_HEIGHT) {
        setError(
          `This image is ${dims.width}x${dims.height}px. Course covers must be exactly ${REQUIRED_COVER_WIDTH}x${REQUIRED_COVER_HEIGHT}px.`,
        );
        return;
      }
      setUploading(true);
      const body = new FormData();
      body.append('file', file);
      const result = await apiFetch<CourseImageUploadResult>('/admin/courses/cover-image', { method: 'POST', body });
      update('image', result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    const dto: CourseInput = {
      ...form,
      technologies: form.technologies.filter((t) => t.name.trim().length > 0),
      outcomes: form.outcomes.map((o) => o.trim()).filter(Boolean),
      requirements: form.requirements.map((r) => r.trim()).filter(Boolean),
      audience: form.audience.map((a) => a.trim()).filter(Boolean),
      toolsCovered: form.toolsCovered.map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (course) {
        const updated = await apiFetch<AdminCourseDetail>(`/admin/courses/${course.id}`, { method: 'PUT', body: JSON.stringify(dto) });
        setCourse(updated);
        setForm(toForm(updated));
        setNotice('Saved.');
      } else {
        const created = await apiFetch<AdminCourseDetail>('/admin/courses', { method: 'POST', body: JSON.stringify(dto) });
        navigate(`/admin/courses/${created.id}`, { replace: true });
        setCourse(created);
        setNotice('Course created.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this course.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!course) return;
    if (!window.confirm(`Delete "${course.title}"? Enrolled students keep their own records, but this removes it from the catalogue.`)) return;
    try {
      await apiFetch(`/admin/courses/${course.id}`, { method: 'DELETE' });
      navigate('/admin/courses', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this course.');
    }
  }

  if (!isNew && existing.status === 'loading') return <p className="adm-muted">Loading…</p>;
  if (!isNew && existing.status === 'error') return <p className="adm-error" role="alert">{existing.message}</p>;

  const categoryNames = categories.status === 'ready' ? categories.data.map((c) => c.name) : [];
  const domainOptions = domains.status === 'ready' ? domains.data : [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Programme</p>
          <h1 className="adm-title">{course ? course.title || 'Edit course' : 'New course'}</h1>
        </div>
        <div className="adm-actions">
          <Link to="/admin/courses" className="adm-btn adm-btn--ghost">
            Back to courses
          </Link>
        </div>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        <h2 className="adm-h2">Content</h2>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Title (shown as the course's H1)</span>
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
            />
          </label>
          <label className="adm-field">
            <span>Subcategory (e.g. "Networking", "Generative AI")</span>
            <input required minLength={2} maxLength={100} list="course-categories" value={form.categoryName} onChange={(e) => update('categoryName', e.target.value)} />
            <datalist id="course-categories">
              {categoryNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="adm-field">
            <span>Catalogue category</span>
            <select value={form.catalogueCategory} onChange={(e) => update('catalogueCategory', e.target.value as CourseInput['catalogueCategory'])}>
              {CATALOGUE_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Homepage domain rail (optional)</span>
            <select value={form.domainId ?? ''} onChange={(e) => update('domainId', e.target.value || null)}>
              <option value="">None</option>
              {domainOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field adm-field--wide">
            <span>Summary (course card + SEO description)</span>
            <textarea required minLength={10} maxLength={400} rows={2} value={form.summary} onChange={(e) => update('summary', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Description (shown in "About this course")</span>
            <textarea required minLength={10} maxLength={3000} rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </label>
        </div>

        <h2 className="adm-h2">Pricing &amp; level</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Pricing model</span>
            <select value={form.pricing} onChange={(e) => update('pricing', e.target.value as CourseInput['pricing'])}>
              {PRICING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Price (USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={((form.priceUsdCents ?? 0) / 100).toString()}
              onChange={(e) => update('priceUsdCents', Math.round(Number(e.target.value || 0) * 100))}
            />
          </label>
          <label className="adm-field">
            <span>"Was" price (USD, optional: shows a strikethrough discount)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.priceWasUsdCents != null ? (form.priceWasUsdCents / 100).toString() : ''}
              onChange={(e) => update('priceWasUsdCents', e.target.value ? Math.round(Number(e.target.value) * 100) : null)}
            />
          </label>
          <label className="adm-field">
            <span>Level</span>
            <select value={form.level} onChange={(e) => update('level', e.target.value as CourseInput['level'])}>
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Duration (hours)</span>
            <input type="number" min={1} max={2000} required value={form.durationHours} onChange={(e) => update('durationHours', Number(e.target.value))} />
          </label>
          <label className="adm-field">
            <span>Duration label (shown on the card, e.g. "4 Weeks (12 Live Sessions, 2 Hours Each)")</span>
            <input required maxLength={80} value={form.durationLabel} onChange={(e) => update('durationLabel', e.target.value)} />
          </label>
        </div>
        <fieldset className="adm-checks">
          <legend className="visually-hidden">Badges</legend>
          {BADGE_OPTIONS.map((b) => (
            <label key={b.value} className="adm-check">
              <input
                type="checkbox"
                checked={form.badges.includes(b.value)}
                onChange={(e) =>
                  update('badges', e.target.checked ? [...form.badges, b.value] : form.badges.filter((x) => x !== b.value))
                }
              />
              <span>{b.label}</span>
            </label>
          ))}
        </fieldset>

        <h2 className="adm-h2">What you&apos;ll explore</h2>
        {form.technologies.map((tech, i) => (
          <div className="adm-grid" key={i}>
            <label className="adm-field">
              <span>Name</span>
              <input value={tech.name} onChange={(e) => updateTechnology(i, { ...tech, name: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Type</span>
              <select value={tech.type} onChange={(e) => updateTechnology(i, { ...tech, type: e.target.value as CourseTechnology['type'] })}>
                {TECH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Icon</span>
              <select value={tech.icon} onChange={(e) => updateTechnology(i, { ...tech, icon: e.target.value })}>
                {TECH_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Tier</span>
              <select value={tech.tier ?? 'core'} onChange={(e) => updateTechnology(i, { ...tech, tier: e.target.value as 'core' | 'optional' })}>
                <option value="core">Core</option>
                <option value="optional">Optional</option>
              </select>
            </label>
            <div className="adm-field">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => update('technologies', form.technologies.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => update('technologies', [...form.technologies, emptyTechnology()])}>
            Add technology
          </button>
        </div>

        <h2 className="adm-h2">Outcomes, requirements &amp; audience</h2>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Outcomes: "What you'll be able to do" (one per line)</span>
            <textarea rows={6} value={form.outcomes.join('\n')} onChange={(e) => update('outcomes', e.target.value.split('\n'))} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Requirements (one per line)</span>
            <textarea rows={3} value={form.requirements.join('\n')} onChange={(e) => update('requirements', e.target.value.split('\n'))} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Intended audience (one per line)</span>
            <textarea rows={3} value={form.audience.join('\n')} onChange={(e) => update('audience', e.target.value.split('\n'))} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Tools covered (one per line, legacy field kept for backward compatibility)</span>
            <textarea rows={2} value={form.toolsCovered.join('\n')} onChange={(e) => update('toolsCovered', e.target.value.split('\n'))} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Certification text</span>
            <input required maxLength={400} value={form.certification} onChange={(e) => update('certification', e.target.value)} />
          </label>
        </div>

        <h2 className="adm-h2">Cover image</h2>
        <div className="adm-grid">
          <div className="adm-field adm-field--wide">
            <span>
              Upload a cover image: must be exactly {REQUIRED_COVER_WIDTH}x{REQUIRED_COVER_HEIGHT}px (16:9, full-bleed, no letterboxing),
              same as every other course cover. A wrong-sized image is rejected, not resized.
            </span>
            <FilePickerButton
              label={uploading ? 'Uploading…' : form.image ? 'Replace image' : 'Choose image'}
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onFiles={handleCoverUpload}
            />
          </div>
          {form.image ? (
            <div className="adm-field adm-field--wide">
              <span>Preview</span>
              <img src={form.image} alt="" style={{ maxWidth: '400px', width: '100%', borderRadius: 8, display: 'block' }} />
            </div>
          ) : null}
        </div>

        <h2 className="adm-h2">Publishing</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value as CourseStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="adm-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="adm-notice" role="status">
            {notice}
          </p>
        ) : null}

        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || uploading || !form.image}>
            {saving ? 'Saving…' : 'Save course'}
          </button>
          {course ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={handleDelete}>
              Delete course
            </button>
          ) : null}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/courses')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
