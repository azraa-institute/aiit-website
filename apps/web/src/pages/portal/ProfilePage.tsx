import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { GeoCity, GeoState } from '@aiit/shared';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch } from '@/lib/api';
import { fetchStates, fetchCities } from '@/lib/geo';
import { uploadFile, publicFileUrl, removeFile } from '@/lib/storage';
import { Avatar } from '@/components/common/Avatar';
import { TextField, SelectField } from '@/components/common/Field';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { Button } from '@/components/primitives/Button';
import { COUNTRIES } from '@/data/countries';
import { QUALIFICATIONS } from '@/data/qualifications';
import { CURRENT_STATUSES } from '@/data/currentStatus';
import { LEARNING_GOALS } from '@/data/learningGoals';
import { LEARNING_AREAS } from '@/data/learningAreas';
import { detectTimeZone, timeZoneOptions } from '@/data/timeZones';
import { useUniversityOptions } from '@/data/universities';
import { isValidPostalCode, postalCodeExample } from '@/data/postalCodePatterns';
import { splitPhone, combinePhone } from '@/lib/phone';
import { CameraIcon, LockIcon } from './SettingsIcons';
import { useLearner } from './learnerData';
import { PhoneCountrySelect } from './PhoneCountrySelect';
import { PortalLoader } from './PortalLoader';
import './support.css';

const AVATARS_BUCKET = 'avatars';
const COUNTRY_OPTIONS = [{ value: '', label: 'Select a country' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))];
const QUALIFICATION_OPTIONS = [{ value: '', label: 'Select your highest qualification' }, ...QUALIFICATIONS];
const STATUS_OPTIONS = [{ value: '', label: 'Select one' }, ...CURRENT_STATUSES];
const GOAL_OPTIONS = [{ value: '', label: 'Select your primary goal' }, ...LEARNING_GOALS];

export default function ProfilePage() {
  const { session } = useAuth();
  const state = useLearner();

  const [initialized, setInitialized] = useState(false);
  useScrollReveal([state.status, initialized]);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [qualification, setQualification] = useState('');
  const [university, setUniversity] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const { options: universityOptions, loading: universitiesLoading } = useUniversityOptions();
  const [universityOther, setUniversityOther] = useState(false);
  const universityOtherChecked = useRef(false);
  useEffect(() => {
    if (universitiesLoading || universityOtherChecked.current) return;
    universityOtherChecked.current = true;
    if (university.trim() && !universityOptions.some((o) => o.value === university)) {
      setUniversityOther(true);
    }
  }, [universitiesLoading, universityOptions, university]);

  // Country -> State -> City cascade -- see ProfileCompletionWizard.tsx for
  // the same pattern and its rationale (state/city stay plain text, the
  // selected state's id is looked up by name rather than tracked
  // separately, and a genuine user-driven change clears what depends on it
  // without clobbering the value loaded from the saved profile).
  const [states, setStates] = useState<GeoState[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // `initialized` and `country`'s loaded-from-profile value land in the same
  // render (both set together in the profile-hydration effect below), so a
  // plain "did country change since last run" ref would see its stale ''
  // default and wrongly treat that first post-load run as a real change.
  // These extra `*GeoReady` refs mark that first run instead, so only a
  // genuine later edit by the user clears the fields that depend on it.
  const prevCountry = useRef(country);
  const countryGeoReady = useRef(false);
  useEffect(() => {
    if (!initialized) return;
    if (countryGeoReady.current && prevCountry.current !== country) {
      setRegion('');
      setCity('');
    }
    countryGeoReady.current = true;
    prevCountry.current = country;
    if (!country) {
      setStates([]);
      return;
    }
    setStatesLoading(true);
    fetchStates(country)
      .then(setStates)
      .catch(() => setStates([]))
      .finally(() => setStatesLoading(false));
  }, [country, initialized]);

  const prevRegion = useRef(region);
  const regionGeoReady = useRef(false);
  useEffect(() => {
    if (!initialized) return;
    if (regionGeoReady.current && prevRegion.current !== region) setCity('');
    regionGeoReady.current = true;
    prevRegion.current = region;
    const selected = states.find((s) => s.name === region);
    if (!selected) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    fetchCities(selected.id)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [region, states, initialized]);

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setName(state.learner.profile.name ?? '');
      setHeadline(state.learner.profile.headline ?? '');
      const { country: dialCountry, national } = splitPhone(state.learner.profile.phone);
      setPhoneCountry(dialCountry);
      setPhoneNational(national);
      setQualification(state.learner.profile.qualification ?? '');
      setUniversity(state.learner.profile.university ?? '');
      setFieldOfStudy(state.learner.profile.fieldOfStudy ?? '');
      setCurrentStatus(state.learner.profile.currentStatus ?? '');
      setLearningGoal(state.learner.profile.learningGoal ?? '');
      setAreasOfInterest(state.learner.profile.areasOfInterest ?? []);
      setCountry(state.learner.profile.country ?? '');
      setRegion(state.learner.profile.state ?? '');
      setCity(state.learner.profile.city ?? '');
      setTimeZone(state.learner.profile.timeZone || detectTimeZone());
      setAddress(state.learner.profile.address ?? '');
      setPostalCode(state.learner.profile.postalCode ?? '');
      setInitialized(true);
    }
  }, [state, initialized]);

  if (state.status === 'loading' || !initialized) return <PortalLoader label="Loading your profile" />;
  if (state.status === 'error') return null;

  const { profile } = state.learner;
  const photoUrl = publicFileUrl(AVATARS_BUCKET, profile.avatarKey);

  const postalExample = country ? postalCodeExample(country) : undefined;
  const postalCodeError =
    postalCode.trim() && country && !isValidPostalCode(country, postalCode)
      ? `Doesn't look like a valid ${COUNTRIES.find((c) => c.code === country)?.name ?? ''} postal code${
          postalExample ? ` (e.g. ${postalExample})` : ''
        }.`
      : undefined;

  function toggleArea(value: string) {
    setAreasOfInterest((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    if (postalCodeError) {
      setError(postalCodeError);
      return;
    }
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
          phone: combinePhone(phoneCountry, phoneNational),
          qualification: qualification.trim(),
          university: university.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          currentStatus: currentStatus.trim(),
          learningGoal: learningGoal.trim(),
          areasOfInterest,
          country: country || undefined,
          state: region.trim(),
          city: city.trim(),
          timeZone: timeZone.trim(),
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
          {universityOther ? (
            <TextField
              label="University / institution"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              maxLength={200}
              hint="Not in our list -- type it in full."
            />
          ) : (
            <SearchableSelect
              label="University / institution"
              value={university}
              onChange={setUniversity}
              options={universityOptions}
              loading={universitiesLoading}
              placeholder="Select or search…"
              searchPlaceholder="Search universities…"
              hint="The institution you're attending or have attended -- not AIIT itself."
            />
          )}
          <button
            type="button"
            className="profile-details__inline-link"
            onClick={() => {
              setUniversityOther((v) => !v);
              setUniversity('');
            }}
          >
            {universityOther ? 'Choose from the list instead' : "Can't find it? Enter it manually."}
          </button>
          <div className="profile-details__grid">
            <TextField
              label="Field of study / discipline"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              maxLength={120}
            />
            <SelectField
              label="Current status"
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <TextField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            hint="A short line about you, shown alongside your name."
          />
          <div className="profile-details__grid">
            <PhoneCountrySelect label="Country code" value={phoneCountry} onChange={setPhoneCountry} required />
            <TextField
              label="Mobile number"
              type="tel"
              value={phoneNational}
              onChange={(e) => setPhoneNational(e.target.value)}
              maxLength={14}
              hint="Without the leading 0, e.g. 8012345678."
              required
            />
          </div>

          <h3 className="profile-details__subtitle">Learning</h3>
          <SelectField
            label="Primary learning goal"
            value={learningGoal}
            onChange={(e) => setLearningGoal(e.target.value)}
            options={GOAL_OPTIONS}
          />
          <div>
            <p className="profile-details__label">Areas of interest</p>
            <div className="profile-details__cards" role="group" aria-label="Areas of interest">
              {LEARNING_AREAS.map(({ value, label, Icon }) => {
                const selected = areasOfInterest.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className="profile-details__card-option"
                    aria-pressed={selected}
                    onClick={() => toggleArea(value)}
                  >
                    <Icon className="profile-details__card-option-icon" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="profile-details__subtitle">Location</h3>
          <p className="portal-page__intro">
            Your location helps us present dates, webinars and learning activities in the right local time.
          </p>
          <div className="profile-details__grid">
            <SelectField
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={COUNTRY_OPTIONS}
              required
            />
            <SearchableSelect
              label="State / province"
              value={region}
              onChange={setRegion}
              options={states.map((s) => ({ value: s.name, label: s.name }))}
              loading={statesLoading}
              disabled={!country}
              disabledHint="Select a country first."
              placeholder="Select or search…"
              searchPlaceholder="Search states…"
              emptyMessage={statesLoading ? undefined : 'No states listed for this country.'}
            />
          </div>
          <div className="profile-details__grid">
            <SearchableSelect
              label="City"
              value={city}
              onChange={setCity}
              options={cities.map((c) => ({ value: c.name, label: c.name }))}
              loading={citiesLoading}
              disabled={!region}
              disabledHint="Select a state or province first."
              placeholder="Select or search…"
              searchPlaceholder="Search cities…"
              emptyMessage={citiesLoading ? undefined : 'No cities listed for this state.'}
            />
            <TextField
              label="Postal / pin code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              maxLength={20}
              error={postalCodeError}
              hint={!postalCodeError && postalExample ? `e.g. ${postalExample}` : undefined}
            />
          </div>
          <SelectField
            label="Time zone"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            options={timeZoneOptions(timeZone)}
          />
          <details className="profile-details__more">
            <summary>Address (optional)</summary>
            <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          </details>

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
            <Button as="button" type="submit" loading={saving} disabled={!!postalCodeError}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      <section className="profile-support" aria-labelledby="profile-support-title">
        <h2 id="profile-support-title">Support &amp; complaints</h2>
        <p>
          Having trouble with your learning, or an issue with a course or an instructor? Report it to the AIIT team —
          your report is private and we reply here in your portal.
        </p>
        <Link to="/portal/support" className="btn btn--secondary">
          Report a problem or see your reports
        </Link>
      </section>
    </div>
  );
}
