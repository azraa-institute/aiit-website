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
import { CameraIcon, LockIcon } from './settings-icons';
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
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setName(state.learner.profile.name ?? '');
      setHeadline(state.learner.profile.headline ?? '');
      setPhone(state.learner.profile.phone ?? '');
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
      // Send the real trimmed value, even when empty -- `|| undefined` here
      // previously dropped a cleared field from the request body entirely
      // (JSON.stringify omits `undefined` properties), so clearing the
      // headline and saving silently left the old value in place server-side.
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), headline: headline.trim(), phone: phone.trim() }),
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
      // A unique key per upload (not a stable `avatar.<ext>`) -- reusing the
      // same key meant the public URL never changed between uploads, so the
      // browser (and Supabase's storage CDN) kept serving the previously
      // cached image bytes at that URL instead of the newly uploaded photo,
      // which looked exactly like the old photo being "stuck".
      const ext = file.name.split('.').pop() ?? 'jpg';
      const previousKey = profile.avatarKey;
      const key = await uploadFile(AVATARS_BUCKET, `${session.user.id}/avatar-${Date.now()}.${ext}`, file);
      await apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ avatarKey: key }) });
      if (previousKey && previousKey !== key) {
        // Best-effort cleanup of the file the new photo replaces -- if it
        // fails, the new photo is already saved and showing, so it
        // shouldn't surface as an error to the user.
        removeFile(AVATARS_BUCKET, previousKey).catch(() => {});
      }
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
        <h1 className="portal-page__title">Profile</h1>
        <p className="portal-page__intro">Manage how your identity appears across AIIT.</p>
      </header>

      <div className="profile-identity" data-reveal>
        <div className="profile-identity__photo">
          <Avatar name={profile.name} photoUrl={photoUrl} size="lg" />
          <label className="profile-identity__camera" aria-label={photoUrl ? 'Change photo' : 'Upload photo'}>
            <CameraIcon />
            <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />
          </label>
        </div>

        <div className="profile-identity__info">
          <p className="profile-identity__name">{profile.name || 'Your profile'}</p>
          <p className="profile-identity__role">Learner</p>
          <div className="profile-identity__actions">
            <label className="btn btn--secondary btn--sm profile-identity__upload">
              {uploadingPhoto ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />
            </label>
            {photoUrl ? (
              <Button as="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                Remove
              </Button>
            ) : null}
          </div>
          <p className="profile-identity__hint">JPG or PNG, up to a few MB.</p>
        </div>
      </div>

      <div className="profile-details" data-reveal>
        <h2 className="profile-details__title">Personal information</h2>

        <form className="profile-details__form" onSubmit={handleSave}>
          {error ? (
            <p className="auth__alert" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? <p className="profile-edit__saved">Saved.</p> : null}

          <div className="profile-details__grid">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            <TextField
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              hint="Optional -- not used for sign-in or verification."
            />
          </div>
          <TextField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            hint="A short line about you, shown alongside your name."
          />

          <div className="profile-details__readonly">
            <LockIcon className="profile-details__readonly-icon" />
            <div>
              <p className="profile-details__readonly-label">Email</p>
              <p className="profile-details__readonly-value">{session?.user.email ?? ''}</p>
            </div>
            <p className="profile-details__readonly-note">Managed in Account Settings</p>
          </div>

          <div className="profile-details__foot">
            <p className="profile-edit__meta">Member since {formatDate(profile.joinedAt)}</p>
            <Button as="button" type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
