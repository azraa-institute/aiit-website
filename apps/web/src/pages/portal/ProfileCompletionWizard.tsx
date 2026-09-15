import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { TextField, SelectField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';
import { COUNTRIES } from '@/data/countries';
import { QUALIFICATIONS } from '@/data/qualifications';
import { splitPhone, combinePhone } from '@/lib/phone';
import { PhoneCountrySelect } from '@/pages/portal/PhoneCountrySelect';
import type { LearnerProfile } from '@/pages/portal/learnerData';
import './profile-completion-wizard.css';

const COUNTRY_OPTIONS = [{ value: '', label: 'Select a country' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))];
const QUALIFICATION_OPTIONS = [{ value: '', label: 'Select your highest qualification' }, ...QUALIFICATIONS];

const STEP_COUNT = 6;
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface ProfileCompletionWizardProps {
  open: boolean;
  profile: LearnerProfile;
  onClose: () => void;
  /** Called after the final step successfully saves -- caller refetches useLearner() and hides the wizard. */
  onComplete: () => void;
}

/**
 * Mounted via a real DOM portal (createPortal into document.body), not as a
 * plain child of the portal shell -- PortalLayout applies a CSS blur to the
 * shell behind this while it's open, and a `filter` on an ancestor would
 * blur this modal too if it stayed nested inside that subtree.
 *
 * Same dialog pattern as the only other modal in this codebase
 * (components/common/EnrollmentPopup.tsx): role="dialog" aria-modal="true",
 * manual focus trap + Escape handling, useLockBodyScroll for the backdrop
 * scroll lock -- just with real form steps instead of a single promo card.
 */
export function ProfileCompletionWizard({ open, profile, onClose, onComplete }: ProfileCompletionWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState(profile.name ?? '');
  const [qualification, setQualification] = useState(profile.qualification ?? '');
  const [university, setUniversity] = useState(profile.university ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [postalCode, setPostalCode] = useState(profile.postalCode ?? '');

  const initialPhone = splitPhone(profile.phone);
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.country);
  const [phoneNational, setPhoneNational] = useState(initialPhone.national);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Reset to step 1 each time the wizard is (re)opened, but keep whatever
  // was already entered in this component instance -- reopening after
  // dismissing mid-flow (not a fresh mount) shouldn't lose progress.
  useEffect(() => {
    if (open) setStep(1);
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
  }, [open, step, onClose]);

  if (!open) return null;

  function next() {
    setError(undefined);
    setStep((s) => (Math.min(s + 1, STEP_COUNT) as Step));
  }
  function back() {
    setError(undefined);
    setStep((s) => (Math.max(s - 1, 1) as Step));
  }

  async function handleFinish() {
    setError(undefined);
    setSaving(true);
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          phone: combinePhone(phoneCountry, phoneNational),
          qualification: qualification.trim(),
          university: university.trim(),
          country: country || undefined,
          city: city.trim(),
          address: address.trim(),
          postalCode: postalCode.trim(),
        }),
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="pcw-scrim">
      <div
        className="pcw-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pcw-title"
        ref={cardRef}
      >
        <div className="pcw-card__head">
          <p className="pcw-card__progress">
            Step {step} of {STEP_COUNT}
          </p>
          <button type="button" className="pcw-card__close" aria-label="Skip for now" ref={closeRef} onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
              <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="pcw-card__bar" aria-hidden="true">
          <span className="pcw-card__bar-fill" style={{ width: `${(step / STEP_COUNT) * 100}%` }} />
        </div>

        {error ? (
          <p className="auth__alert" role="alert">
            {error}
          </p>
        ) : null}

        {step === 1 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              Let&apos;s complete your profile
            </h2>
            <p className="pcw-step__body">
              A complete profile is required before you can enroll in courses or use your learner portal. It only
              takes a couple of minutes -- name, phone number, education, and location.
            </p>
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

        {step === 2 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              About you
            </h2>
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
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
              <Button as="button" variant="ghost" onClick={back}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              Education
            </h2>
            <SelectField
              label="Highest qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              options={QUALIFICATION_OPTIONS}
              required
            />
            <TextField
              label="University / institution"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              maxLength={200}
              hint="The institution you're attending or have attended."
              required
            />
            <div className="pcw-step__actions">
              <Button as="button" onClick={next} disabled={!qualification || !university.trim()}>
                Continue
              </Button>
              <Button as="button" variant="ghost" onClick={back}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              Where you're based
            </h2>
            <SelectField
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={COUNTRY_OPTIONS}
              required
            />
            <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} required />
            <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} required />
            <TextField
              label="Zip / postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              maxLength={20}
              required
            />
            <div className="pcw-step__actions">
              <Button as="button" onClick={next} disabled={!country || !city.trim() || !address.trim() || !postalCode.trim()}>
                Continue
              </Button>
              <Button as="button" variant="ghost" onClick={back}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              Know your way around
            </h2>
            <ul className="pcw-tour" role="list">
              <li>
                <strong>Dashboard</strong> — your progress at a glance.
              </li>
              <li>
                <strong>My Courses</strong> — continue where you left off.
              </li>
              <li>
                <strong>Certificates</strong> — download once you finish a course.
              </li>
              <li>
                <strong>Account</strong> — Profile and Account Settings, including your notification preferences,
                live here.
              </li>
            </ul>
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

        {step === 6 && (
          <div className="pcw-step">
            <h2 id="pcw-title" className="pcw-step__title">
              Review and finish
            </h2>
            <dl className="pcw-review">
              <div>
                <dt>Name</dt>
                <dd>{name || '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{phoneCountry && phoneNational ? combinePhone(phoneCountry, phoneNational) : '—'}</dd>
              </div>
              <div>
                <dt>Qualification</dt>
                <dd>{QUALIFICATIONS.find((q) => q.value === qualification)?.label ?? '—'}</dd>
              </div>
              <div>
                <dt>University</dt>
                <dd>{university || '—'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {[address, city, postalCode, COUNTRIES.find((c) => c.code === country)?.name]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </dd>
              </div>
            </dl>
            <div className="pcw-step__actions">
              <Button as="button" onClick={handleFinish} loading={saving}>
                Finish
              </Button>
              <Button as="button" type="button" variant="ghost" onClick={back}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
