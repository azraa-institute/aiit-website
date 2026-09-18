import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GeoCity, GeoState } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { fetchStates, fetchCities } from '@/lib/geo';
import { splitPhone, combinePhone } from '@/lib/phone';
import { TextField, SelectField } from '@/components/common/Field';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { Button } from '@/components/primitives/Button';
import { Logo } from '@/components/layout/Logo';
import { COUNTRIES } from '@/data/countries';
import { QUALIFICATIONS } from '@/data/qualifications';
import { CURRENT_STATUSES } from '@/data/currentStatus';
import { LEARNING_GOALS } from '@/data/learningGoals';
import { LEARNING_AREAS } from '@/data/learningAreas';
import { detectTimeZone, timeZoneOptions, formatTimeZoneLabel } from '@/data/timeZones';
import { useUniversityOptions } from '@/data/universities';
import { isValidPostalCode, postalCodeExample } from '@/data/postalCodePatterns';
import { PhoneCountrySelect } from './PhoneCountrySelect';
import type { LearnerProfile } from '@/pages/portal/learnerData';
import './profile-completion-wizard.css';

const COUNTRY_OPTIONS = [{ value: '', label: 'Select a country' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))];
const QUALIFICATION_OPTIONS = [{ value: '', label: 'Select your highest qualification' }, ...QUALIFICATIONS];
const STATUS_OPTIONS = [{ value: '', label: 'Select one' }, ...CURRENT_STATUSES];
const GOAL_OPTIONS = [{ value: '', label: 'Select your primary goal' }, ...LEARNING_GOALS];

/** The 5 counted steps -- Welcome and the post-save Completion moment sit outside this count, same as the guided tour's own intro/done bookends. */
type Step = 1 | 2 | 3 | 4 | 5;
type Phase = 'welcome' | Step | 'completion';
const STEP_COUNT = 5;
const STEP_LABELS: Record<Step, string> = {
  1: 'About you',
  2: 'Education',
  3: 'Goals',
  4: 'Location',
  5: 'Review',
};

interface ProfileCompletionWizardProps {
  open: boolean;
  profile: LearnerProfile;
  /** Closes without saving -- "Skip for now" at any point. Entered data is kept in this component instance for a later reopen. */
  onClose: () => void;
  /** Fires only after a successful save, once the learner picks an action on the completion screen. Caller refetches useLearner(), hides the wizard, and opens the guided tour when action is 'tour'. */
  onComplete: (action: 'tour' | 'skip') => void;
}

/**
 * The profile-completion wizard -- collects the learner's profile only.
 * Portal orientation is a separate, second experience (see GuidedTour.tsx),
 * offered from this wizard's own completion screen rather than bundled in
 * as a step here.
 *
 * Two-zone composition on desktop: a dark editorial visual panel (left)
 * that evolves per step, and the actual form (right); collapses to a
 * single column with the panel as a compact header under ~1024px. Same
 * portal-mount/focus-trap/Escape/useLockBodyScroll mechanics as the only
 * other modal precedents in this codebase (EnrollmentPopup, GuidedTour).
 */
export function ProfileCompletionWizard({ open, profile, onClose, onComplete }: ProfileCompletionWizardProps) {
  const [phase, setPhase] = useState<Phase>('welcome');
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState(profile.name ?? '');
  const initialPhone = splitPhone(profile.phone);
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.country);
  const [phoneNational, setPhoneNational] = useState(initialPhone.national);

  const [qualification, setQualification] = useState(profile.qualification ?? '');
  const [university, setUniversity] = useState(profile.university ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy ?? '');
  const [currentStatus, setCurrentStatus] = useState(profile.currentStatus ?? '');

  const [learningGoal, setLearningGoal] = useState(profile.learningGoal ?? '');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>(profile.areasOfInterest ?? []);

  const [country, setCountry] = useState(profile.country ?? '');
  const [state, setState] = useState(profile.state ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [postalCode, setPostalCode] = useState(profile.postalCode ?? '');
  const [timeZone, setTimeZone] = useState(profile.timeZone || detectTimeZone());

  const { options: universityOptions, loading: universitiesLoading } = useUniversityOptions();
  // Defaults to manual-entry mode once loaded if the saved university isn't
  // in the bundled list -- a previously-typed value shouldn't silently
  // vanish behind a picker that can't represent it. Only checked once per
  // load finishing, not on every keystroke, so it doesn't fight a user
  // who deliberately switches modes afterwards.
  const [universityOther, setUniversityOther] = useState(false);
  const universityOtherChecked = useRef(false);
  useEffect(() => {
    if (universitiesLoading || universityOtherChecked.current) return;
    universityOtherChecked.current = true;
    if (university.trim() && !universityOptions.some((o) => o.value === university)) {
      setUniversityOther(true);
    }
  }, [universitiesLoading, universityOptions, university]);

  // Country -> State -> City cascade. `state`/`city` stay plain text (the
  // chosen name, same convention as the rest of the profile) -- these
  // GeoState/GeoCity lists are only how the pickers *offer* choices, not
  // what gets submitted, so the selected state's id is looked up by name
  // rather than tracked separately.
  const [states, setStates] = useState<GeoState[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const prevCountry = useRef(country);
  useEffect(() => {
    if (prevCountry.current !== country) {
      setState('');
      setCity('');
    }
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
  }, [country]);

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) setCity('');
    prevState.current = state;
    const selected = states.find((s) => s.name === state);
    if (!selected) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    fetchCities(selected.id)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [state, states]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Reset to the welcome screen each time the wizard is (re)opened, but
  // keep whatever was already entered in this component instance --
  // reopening after dismissing mid-flow (not a fresh mount) shouldn't lose
  // progress.
  useEffect(() => {
    if (open) setPhase('welcome');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, phase, onClose]);

  if (!open) return null;

  function next() {
    setError(undefined);
    setPhase((p) => (typeof p === 'number' ? (Math.min(p + 1, STEP_COUNT) as Step) : p === 'welcome' ? 1 : p));
  }
  function back() {
    setError(undefined);
    setPhase((p) => (typeof p === 'number' ? (Math.max(p - 1, 1) as Step) : p));
  }
  function toggleArea(value: string) {
    setAreasOfInterest((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleFinish() {
    setError(undefined);
    if (country && postalCode.trim() && !isValidPostalCode(country, postalCode)) {
      setError("That postal/pin code doesn't look right for the selected country.");
      setPhase(4);
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          phone: combinePhone(phoneCountry, phoneNational),
          qualification: qualification.trim(),
          university: university.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          currentStatus: currentStatus.trim(),
          learningGoal: learningGoal.trim(),
          areasOfInterest,
          timeZone: timeZone.trim(),
          country: country || undefined,
          state: state.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
        }),
      });
      setPhase('completion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const postalExample = country ? postalCodeExample(country) : undefined;
  const postalCodeError =
    postalCode.trim() && country && !isValidPostalCode(country, postalCode)
      ? `Doesn't look like a valid ${COUNTRIES.find((c) => c.code === country)?.name ?? ''} postal code${
          postalExample ? ` (e.g. ${postalExample})` : ''
        }.`
      : undefined;

  const stepNumber = typeof phase === 'number' ? phase : phase === 'welcome' ? 0 : STEP_COUNT;

  return createPortal(
    <div className="pcw-scrim">
      <div className="pcw-shell" role="dialog" aria-modal="true" aria-labelledby="pcw-title" ref={cardRef}>
        <WizardVisual phase={phase} />

        <div className="pcw-content">
          <div className="pcw-content__head">
            {typeof phase === 'number' ? (
              <div className="pcw-progress">
                <p className="pcw-progress__eyebrow">Profile</p>
                <p className="pcw-progress__count">
                  {String(stepNumber).padStart(2, '0')} / {String(STEP_COUNT).padStart(2, '0')}
                </p>
              </div>
            ) : (
              <span />
            )}
            <button type="button" className="pcw-close" aria-label="Skip for now" ref={closeRef} onClick={onClose}>
              <CloseGlyph />
            </button>
          </div>

          {typeof phase === 'number' && (
            <div className="pcw-steps" aria-hidden="true">
              {(Object.keys(STEP_LABELS) as unknown as Step[]).map((s) => (
                <span key={s} className={s <= phase ? 'is-done' : undefined}>
                  {STEP_LABELS[s]}
                </span>
              ))}
            </div>
          )}

          {error ? (
            <p className="auth__alert" role="alert">
              {error}
            </p>
          ) : null}

          {phase === 'welcome' && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Build your learning profile
              </h2>
              <p className="pcw-step__body">
                Completing your profile helps AIIT.NETWORK personalize your experience and makes sure your
                information is ready for courses, certificates and learning activities.
              </p>
              <ul className="pcw-benefits">
                <li>Personalized learning experience</li>
                <li>Ready for certificates</li>
                <li>Access to your learning areas</li>
                <li>Better course recommendations</li>
              </ul>
              <div className="pcw-step__actions">
                <Button as="button" onClick={next}>
                  Get started
                </Button>
                <Button as="button" variant="ghost" onClick={onClose}>
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {phase === 1 && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                About you
              </h2>
              <TextField
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                hint="Use the name you would like to appear on your certificates."
                required
              />
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
              <div className="pcw-step__actions">
                <Button as="button" onClick={next} disabled={!name.trim() || !phoneCountry || !phoneNational.trim()}>
                  Continue
                </Button>
                <Button as="button" variant="ghost" onClick={onClose}>
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {phase === 2 && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Your education
              </h2>
              <SelectField
                label="Highest qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                options={QUALIFICATION_OPTIONS}
                required
              />
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
                  hint="The institution you're attending or have attended."
                />
              )}
              <button
                type="button"
                className="pcw-inline-link"
                onClick={() => {
                  setUniversityOther((v) => !v);
                  setUniversity('');
                }}
              >
                {universityOther ? 'Choose from the list instead' : "Can't find it? Enter it manually."}
              </button>
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
              <div className="pcw-step__actions">
                <Button as="button" onClick={next} disabled={!qualification}>
                  Continue
                </Button>
                <Button as="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {phase === 3 && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Your learning goals
              </h2>
              <SelectField
                label="Primary learning goal"
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                options={GOAL_OPTIONS}
              />
              <div>
                <p className="pcw-field-label">Areas of interest</p>
                <div className="pcw-cards" role="group" aria-label="Areas of interest">
                  {LEARNING_AREAS.map(({ value, label, Icon }) => {
                    const selected = areasOfInterest.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className="pcw-card-option"
                        aria-pressed={selected}
                        onClick={() => toggleArea(value)}
                      >
                        <Icon className="pcw-card-option__icon" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pcw-step__actions">
                <Button as="button" onClick={next}>
                  Continue
                </Button>
                <Button as="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {phase === 4 && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Where you&apos;re based
              </h2>
              <p className="pcw-step__body">
                Your location helps us present dates, webinars and learning activities in the right local time.
              </p>
              <SelectField
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                options={COUNTRY_OPTIONS}
                required
              />
              <SearchableSelect
                label="State / province"
                value={state}
                onChange={setState}
                options={states.map((s) => ({ value: s.name, label: s.name }))}
                loading={statesLoading}
                disabled={!country}
                disabledHint="Select a country first."
                placeholder="Select or search…"
                searchPlaceholder="Search states…"
                emptyMessage={statesLoading ? undefined : 'No states listed for this country.'}
              />
              <SearchableSelect
                label="City"
                value={city}
                onChange={setCity}
                options={cities.map((c) => ({ value: c.name, label: c.name }))}
                loading={citiesLoading}
                disabled={!state}
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
              <SelectField
                label="Time zone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                options={timeZoneOptions(timeZone)}
              />
              <div className="pcw-step__actions">
                <Button as="button" onClick={next} disabled={!country || !!postalCodeError}>
                  Continue
                </Button>
                <Button as="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {phase === 5 && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Review your profile
              </h2>
              <div className="pcw-passport">
                <div className="pcw-passport__head">
                  <p className="pcw-passport__brand">AIIT.NETWORK</p>
                  <p className="pcw-passport__kind">Learner profile</p>
                </div>

                <ReviewSection title="Identity" onEdit={() => setPhase(1)}>
                  <ReviewRow label="Full name" value={name} />
                  <ReviewRow label="Phone" value={phoneCountry && phoneNational ? combinePhone(phoneCountry, phoneNational) : ''} />
                </ReviewSection>

                <ReviewSection title="Education" onEdit={() => setPhase(2)}>
                  <ReviewRow label="Qualification" value={QUALIFICATIONS.find((q) => q.value === qualification)?.label} />
                  <ReviewRow label="Institution" value={university} />
                  <ReviewRow label="Field of study" value={fieldOfStudy} />
                </ReviewSection>

                <ReviewSection title="Learning" onEdit={() => setPhase(3)}>
                  <ReviewRow label="Current status" value={CURRENT_STATUSES.find((s) => s.value === currentStatus)?.label} />
                  <ReviewRow label="Goal" value={LEARNING_GOALS.find((g) => g.value === learningGoal)?.label} />
                  <ReviewRow
                    label="Interests"
                    value={LEARNING_AREAS.filter((a) => areasOfInterest.includes(a.value))
                      .map((a) => a.label)
                      .join(', ')}
                  />
                </ReviewSection>

                <ReviewSection title="Location" onEdit={() => setPhase(4)}>
                  <ReviewRow label="Country" value={COUNTRIES.find((c) => c.code === country)?.name} />
                  <ReviewRow label="State / province" value={state} />
                  <ReviewRow label="City" value={city} />
                  <ReviewRow label="Postal / pin code" value={postalCode} />
                  <ReviewRow label="Time zone" value={timeZone ? formatTimeZoneLabel(timeZone) : timeZone} />
                </ReviewSection>
              </div>
              <div className="pcw-step__actions">
                <Button as="button" onClick={handleFinish} loading={saving}>
                  Complete my profile
                </Button>
                <Button as="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {phase === 'completion' && (
            <div className="pcw-step">
              <h2 id="pcw-title" className="pcw-step__title">
                Your learning profile is ready.
              </h2>
              <p className="pcw-step__body">Now let&apos;s show you around.</p>
              <div className="pcw-step__actions">
                <Button as="button" onClick={() => onComplete('tour')}>
                  Take the tour
                </Button>
                <Button as="button" variant="ghost" onClick={() => onComplete('skip')}>
                  Skip tour
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="pcw-passport__section">
      <div className="pcw-passport__section-head">
        <p className="pcw-passport__label">{title}</p>
        <button type="button" className="pcw-passport__edit" onClick={onEdit}>
          Edit
        </button>
      </div>
      <dl className="pcw-passport__list">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

const VISUAL_COPY: Record<Phase, { eyebrow: string; title: string }> = {
  welcome: { eyebrow: 'AIIT.NETWORK', title: "Let's build your learning profile." },
  1: { eyebrow: 'Step 01', title: 'Who you are.' },
  2: { eyebrow: 'Step 02', title: 'Where you’ve studied.' },
  3: { eyebrow: 'Step 03', title: 'What you’re here to do.' },
  4: { eyebrow: 'Step 04', title: 'Where you learn from.' },
  5: { eyebrow: 'Step 05', title: 'Your profile, reviewed.' },
  completion: { eyebrow: 'AIIT.NETWORK', title: 'Identity established.' },
};

/**
 * The wizard's left editorial panel -- a compact header on mobile (see
 * profile-completion-wizard.css). One shared contour+node motif (adapted
 * from PortalAtmosphere.tsx's "learning network" art), evolving subtly per
 * step by which node is lit rather than six separate illustrations.
 */
function WizardVisual({ phase }: { phase: Phase }) {
  const activeNode = typeof phase === 'number' ? phase - 1 : phase === 'completion' ? 4 : -1;
  const nodes = [
    { cx: 60, cy: 96 },
    { cx: 132, cy: 150 },
    { cx: 96, cy: 232 },
    { cx: 180, cy: 268 },
    { cx: 150, cy: 340 },
  ];
  const copy = VISUAL_COPY[phase];

  return (
    <div className="pcw-visual on-ink">
      <div className="pcw-visual__brand">
        <Logo variant="light" className="pcw-visual__logo" />
        <span className="pcw-visual__brand-sub">Learner profile</span>
      </div>

      <svg className="pcw-visual__motif" viewBox="0 0 240 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path className="pcwv-contour" d="M10 60 C 70 30, 140 70, 220 40" />
        <path className="pcwv-contour" d="M0 200 C 60 170, 150 220, 230 190" />
        <path className="pcwv-contour" d="M20 340 C 90 310, 160 360, 230 330" />
        <g className="pcwv-net">
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            return <path key={i} className="pcwv-link" d={`M${n.cx} ${n.cy} L ${next.cx} ${next.cy}`} />;
          })}
          {nodes.map((n, i) => (
            <circle key={i} className={i === activeNode ? 'pcwv-node is-active' : 'pcwv-node'} cx={n.cx} cy={n.cy} r={i === activeNode ? 5 : 3} />
          ))}
        </g>
      </svg>

      <div className="pcw-visual__copy">
        <p className="pcw-visual__eyebrow">{copy.eyebrow}</p>
        <h2 className="pcw-visual__title">{copy.title}</h2>
      </div>
    </div>
  );
}
