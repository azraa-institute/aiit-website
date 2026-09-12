import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch } from '@/lib/api';
import { uploadFile, publicFileUrl, removeFile } from '@/lib/storage';
import { Avatar } from '@/components/common/Avatar';
import { TextField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';
import { useLearner } from './learnerData';
import { PortalLoader } from './PortalLoader';

const AVATARS_BUCKET = 'avatars';

export default function ProfilePage() {
  const { session } = useAuth();
  const state = useLearner();

  const [initialized, setInitialized] = useState(false);
  useScrollReveal([state.status, initialized]);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setName(state.learner.profile.name ?? '');
      setHeadline(state.learner.profile.headline ?? '');
      setInitialized(true);
    }
  }, [state, initialized]);

  if (state.status === 'loading' || !initialized) return <PortalLoader label="Loading your profile" />;
  if (state.status === 'error') return null;

  const { profile } = state.learner;
  const photoUrl = publicFileUrl(AVATARS_BUCKET, profile.avatarKey);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() || undefined, headline: headline.trim() || undefined }),
      });
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
    if (!file || !session) return;

    setError(undefined);
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const key = await uploadFile(AVATARS_BUCKET, `${session.user.id}/avatar.${ext}`, file);
      await apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ avatarKey: key }) });
      state.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!profile.avatarKey) return;
    setError(undefined);
    setUploadingPhoto(true);
    try {
      await removeFile(AVATARS_BUCKET, profile.avatarKey);
      await apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ avatarKey: '' }) });
      state.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Profile</p>
        <h1 className="portal-page__title">{profile.name ?? 'Your profile'}</h1>
        <p className="portal-page__intro">
          How you appear across AIIT — your learning identity, kept in one place.
        </p>
      </header>

      <div className="profile-edit" data-reveal>
        <div className="profile-edit__photo">
          <Avatar name={profile.name} photoUrl={photoUrl} size="lg" />
          <div className="profile-edit__photo-actions">
            <label className="btn btn--secondary btn--sm profile-edit__upload">
              {uploadingPhoto ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />
            </label>
            {photoUrl ? (
              <Button as="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <form className="profile-edit__form" onSubmit={handleSave}>
          {error ? (
            <p className="auth__alert" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? <p className="profile-edit__saved">Saved.</p> : null}

          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          <TextField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            hint="A short line about you, shown alongside your name."
          />
          <TextField
            label="Email"
            value={session?.user.email ?? ''}
            disabled
            readOnly
            hint="Managed in Account Settings."
          />
          <p className="profile-edit__meta">Member since {formatDate(profile.joinedAt)}</p>

          <Button as="button" type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      </div>
    </div>
  );
}
