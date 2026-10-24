import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMe } from '@/lib/me';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { publicFileUrl } from '@/lib/storage';
import { Avatar } from '@/components/common/Avatar';
import './affiliate-portal.css';

/** Mirrors the avatars bucket's own limits and POST /me/avatar's own server-side check -- this is just the fast client-side rejection. */
const AVATARS_BUCKET = 'avatars';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * A deliberately lean Profile page for affiliates -- avatar + name +
 * headline only, via the same generic PATCH /me and /me/avatar endpoints
 * the student portal's own ProfilePage uses (an affiliate account is a
 * regular learner-role account under the hood, so these already work
 * unchanged). The learner portal's much larger form (qualification,
 * university, learning goals, areas of interest...) is genuinely
 * student-specific and doesn't belong here -- an affiliate's own contact
 * details (phone/country/city/etc.) already live on the Account settings
 * page instead.
 */
export default function AffiliateProfilePage() {
  const { session } = useAuth();
  const state = useMe();
  const [initialized, setInitialized] = useState(false);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string>();

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setName(state.me.name ?? '');
      setHeadline(state.me.headline ?? '');
      setInitialized(true);
    }
  }, [state, initialized]);

  if (state.status === 'loading' || !initialized) return <p className="aff-loading">Loading…</p>;
  if (state.status === 'error') {
    return (
      <p className="aff-error" role="alert">
        {state.error.message}
      </p>
    );
  }

  const { me } = state;
  const photoUrl = publicFileUrl(AVATARS_BUCKET, me.avatarKey);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), headline: headline.trim() }) });
      state.refetch();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoError('That file is too large (max 2MB).');
      return;
    }
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setPhotoError("That file type isn't supported (allowed: jpeg, png, webp).");
      return;
    }
    setPhotoError(undefined);
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append('file', file);
      await apiFetch('/me/avatar', { method: 'POST', body });
      state.refetch();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not upload your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!me.avatarKey) return;
    setPhotoError(undefined);
    setUploadingPhoto(true);
    try {
      await apiFetch('/me/avatar', { method: 'DELETE' });
      state.refetch();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not remove your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="aff-dash">
      <section className="aff-card">
        <p className="aff-eyebrow">Promote AIIT</p>
        <h2>Profile</h2>
        <p>How your identity appears across AIIT, including inside the affiliate portal.</p>

        <div className="aff-profile__identity">
          <Avatar name={me.name} photoUrl={photoUrl} size="lg" />
          <div>
            <div className="aff-profile__actions">
              <label className="btn btn--secondary btn--sm aff-profile__upload">
                {uploadingPhoto ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />
              </label>
              {photoUrl ? (
                <button type="button" className="aff-profile__remove" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                  Remove
                </button>
              ) : null}
            </div>
            <p className="aff-profile__hint">JPG or PNG, up to 2MB.</p>
            {photoError ? (
              <p className="adm-error" role="alert">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>

        <form className="adm-form" onSubmit={handleSave}>
          <div className="adm-grid">
            <label className="adm-field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
            </label>
            <label className="adm-field">
              <span>Headline</span>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} placeholder="A short line about you" />
            </label>
          </div>
          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="adm-notice" role="status">
              Saved.
            </p>
          ) : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <p className="aff-card__footnote">
          Email: {session?.user.email ?? ''} · Member since {formatDate(me.createdAt)}
        </p>
      </section>
    </div>
  );
}
