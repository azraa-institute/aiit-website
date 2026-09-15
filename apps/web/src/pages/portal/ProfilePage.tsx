import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { uploadFile, publicFileUrl, removeFile } from '@/lib/storage';
import { Avatar } from '@/components/common/Avatar';
import { TextField, SelectField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';
import { COUNTRIES } from '@/data/countries';
import { QUALIFICATIONS } from '@/data/qualifications';
import { CameraIcon, LockIcon } from './SettingsIcons';
import { useLearner } from './learnerData';
import { PortalLoader } from './PortalLoader';

const AVATARS_BUCKET = 'avatars';
const COUNTRY_OPTIONS = [{ value: '', label: 'Select a country' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))];
const QUALIFICATION_OPTIONS = [{ value: '', label: 'Select your highest qualification' }, ...QUALIFICATIONS];

export default function ProfilePage() {
  const { session } = useAuth();
  const state = useLearner();

  const [initialized, setInitialized] = useState(false);
  useScrollReveal([state.status, initialized]);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [qualification, setQualification] = useState('');
  const [university, setUniversity] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  // Phone is deliberately its own mini-flow, not bundled into the main
  // Save button -- a phone number only counts once it's been through
  // Supabase's OTP verification (see handleSendPhoneCode/handleVerifyPhoneCode
  // below), so editing it can't just silently ride along with an unrelated
  // "Save changes" click.
  const [phoneInput, setPhoneInput] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneError, setPhoneError] = useState<string>();

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setName(state.learner.profile.name ?? '');
      setHeadline(state.learner.profile.headline ?? '');
      setQualification(state.learner.profile.qualification ?? '');
      setUniversity(state.learner.profile.university ?? '');
      setCountry(state.learner.profile.country ?? '');
      setCity(state.learner.profile.city ?? '');
      setAddress(state.learner.profile.address ?? '');
      setPostalCode(state.learner.profile.postalCode ?? '');
      setPhoneInput(state.learner.profile.phone ?? '');
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
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          qualification: qualification.trim(),
          university: university.trim(),
          country: country || undefined,
          city: city.trim(),
          address: address.trim(),
          postalCode: postalCode.trim(),
        }),
      });
      state.refetch();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPhoneCode(e: FormEvent) {
    e.preventDefault();
    setPhoneError(undefined);
    if (!supabase) {
      setPhoneError('Phone verification is not configured yet.');
      return;
    }
    setSendingCode(true);
    const { error: err } = await supabase.auth.updateUser({ phone: phoneInput.trim() });
    setSendingCode(false);
    if (err) {
      setPhoneError(err.message);
      return;
    }
    setCodeSent(true);
  }

  async function handleVerifyPhoneCode(e: FormEvent) {
    e.preventDefault();
    setPhoneError(undefined);
    if (!supabase) {
      setPhoneError('Phone verification is not configured yet.');
      return;
    }
    setVerifyingCode(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: phoneInput.trim(),
      token: phoneCode.trim(),
      type: 'phone_change',
    });
    if (err) {
      setVerifyingCode(false);
      setPhoneError(err.message);
      return;
    }
    try {
      // Persists phone + phoneVerifiedAt on the Profile row -- the backend
      // independently re-checks the auth user's phone_confirmed_at via the
      // Supabase Admin API before trusting this, see ProfileService.
      await apiFetch('/me/phone/confirm', { method: 'POST' });
      state.refetch();
      setEditingPhone(false);
      setCodeSent(false);
      setPhoneCode('');
    } catch (confirmErr) {
      setPhoneError(confirmErr instanceof Error ? confirmErr.message : 'Could not confirm your phone number.');
    } finally {
      setVerifyingCode(false);
    }
  }

  function handleChangePhoneNumber() {
    setPhoneError(undefined);
    setCodeSent(false);
    setPhoneCode('');
    setEditingPhone(true);
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
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
            <SelectField
              label="Highest qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              options={QUALIFICATION_OPTIONS}
              required
            />
          </div>
          <TextField
            label="University / institution"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            maxLength={200}
            hint="The institution you're attending or have attended -- not AIIT itself."
            required
          />
          <TextField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            hint="A short line about you, shown alongside your name."
          />

          <h3 className="profile-details__subtitle">Location</h3>
          <div className="profile-details__grid">
            <SelectField
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={COUNTRY_OPTIONS}
              required
            />
            <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} required />
          </div>
          <div className="profile-details__grid">
            <TextField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              required
            />
            <TextField
              label="Zip / postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              maxLength={20}
              required
            />
          </div>

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

      <div className="profile-details" data-reveal>
        <h2 className="profile-details__title">Phone verification</h2>
        <p className="portal-page__intro">
          A verified phone number is required to complete your profile.
        </p>

        {phoneError ? (
          <p className="auth__alert" role="alert">
            {phoneError}
          </p>
        ) : null}

        {profile.phoneVerifiedAt && !editingPhone ? (
          <div className="profile-details__readonly">
            <LockIcon className="profile-details__readonly-icon" />
            <div>
              <p className="profile-details__readonly-label">Verified phone number</p>
              <p className="profile-details__readonly-value">{profile.phone}</p>
            </div>
            <Button as="button" variant="ghost" size="sm" onClick={handleChangePhoneNumber}>
              Change
            </Button>
          </div>
        ) : !codeSent ? (
          <form className="profile-details__form" onSubmit={handleSendPhoneCode}>
            <TextField
              label="Phone number"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              maxLength={16}
              hint="Include your country code, e.g. +2348012345678."
              required
            />
            <div className="profile-details__foot">
              <Button as="button" type="submit" loading={sendingCode}>
                Send verification code
              </Button>
            </div>
          </form>
        ) : (
          <form className="profile-details__form" onSubmit={handleVerifyPhoneCode}>
            <p className="portal-page__intro">We sent a code to {phoneInput}.</p>
            <TextField
              label="6-digit code"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
            <div className="profile-details__actions">
              <Button as="button" type="submit" loading={verifyingCode} disabled={phoneCode.length !== 6}>
                Verify and save
              </Button>
              <Button as="button" variant="ghost" onClick={handleChangePhoneNumber}>
                Use a different number
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
