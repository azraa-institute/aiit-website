import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { TextField, PasswordField, SelectField } from '@/components/common/Field';
import { Button } from '@/components/primitives/Button';
import { COUNTRIES } from '@/data/countries';
import { LANGUAGES } from '@/data/languages';
import { MailIcon, LockIcon, MonitorIcon, GlobeIcon, TrashIcon } from './settings-icons';
import { useLearner } from './learnerData';
import { PortalLoader } from './PortalLoader';
import { SecurityFactorsSection } from './SecurityFactorsSection';
import { LinkedAccountsSection } from './LinkedAccountsSection';

const COUNTRY_OPTIONS = [{ value: '', label: 'Not set' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))];
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const SETTINGS_NAV_ITEMS = [
  { id: 'sign-in-security', label: 'Sign-in & security' },
  { id: 'linked-accounts', label: 'Linked accounts' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'two-factor', label: 'Two-factor authentication' },
  { id: 'danger-zone', label: 'Danger zone', danger: true },
] as const;

export default function SettingsPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your settings" />;
  if (state.status === 'error') return null;

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Account settings</p>
        <h1 className="portal-page__title">Account settings</h1>
        <p className="portal-page__intro">Manage your account, security and preferences.</p>
      </header>

      <div className="settings-shell" data-reveal>
        <SettingsNav />
        <div className="settings-panels">
          <SignInSecuritySection />
          <LinkedAccountsSection />
          <RegionLanguageSection />
          <SecurityFactorsSection />
          <DangerZoneSection />
        </div>
      </div>

      <p className="settings__foot" data-reveal>
        Need help with your account? <Link to="/contact">Contact the AIIT team</Link>.
      </p>
    </div>
  );
}

/** Anchor nav for the settings sections below -- every section stays mounted
 * and visible (not a hide/show tab), so a save confirmation or error a
 * section is showing never gets hidden by switching tabs. IntersectionObserver
 * only drives which link is highlighted as "active" while scrolling. */
function SettingsNav() {
  const [activeId, setActiveId] = useState<string>(SETTINGS_NAV_ITEMS[0].id);

  useEffect(() => {
    const elements = SETTINGS_NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="settings-nav" aria-label="Settings sections">
      {SETTINGS_NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            'settings-nav__link',
            'danger' in item && item.danger && 'settings-nav__link--danger',
            activeId === item.id && 'is-active',
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function SignInSecuritySection() {
  const { session } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>();
  const [emailError, setEmailError] = useState<string>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState<string>();

  async function handleEmailChange(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setEmailError('Not configured yet.');
      return;
    }
    setEmailError(undefined);
    setEmailMessage(undefined);
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message);
      return;
    }
    setEmailMessage('Check your new email address for a confirmation link -- the change applies once you confirm it.');
    setNewEmail('');
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setPasswordError('Not configured yet.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError(undefined);
    setPasswordMessage(undefined);
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    // Supabase's own native "Password Changed" security notification
    // (Dashboard -> Authentication -> Emails -> Security) handles telling
    // the user about this now -- no app-level call needed.
    setPasswordMessage('Password updated.');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleSignOutEverywhere() {
    if (!supabase) return;
    setSigningOutEverywhere(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setSigningOutEverywhere(false);
    setSignOutMessage(error ? error.message : 'Signed out of every device. You will be signed out here too shortly.');
  }

  return (
    <section id="sign-in-security" className="settings-section" data-reveal>
      <div className="settings-section__head">
        <span className="settings-section__icon">
          <LockIcon />
        </span>
        <h2 className="settings-section__title">Sign-in &amp; security</h2>
      </div>

      <div className="settings-section__subcard">
        <form onSubmit={handleEmailChange}>
          <h3 className="settings-section__subtitle">
            <MailIcon /> Email address
          </h3>
          <p className="settings__body">
            Current email <strong>{session?.user.email ?? '—'}</strong>
          </p>
          <div className="settings-section__form">
            {emailError ? (
              <p className="auth__alert" role="alert">
                {emailError}
              </p>
            ) : null}
            {emailMessage ? <p className="profile-edit__saved">{emailMessage}</p> : null}
            <TextField
              label="New email address"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Button as="button" type="submit" variant="secondary" size="sm" loading={emailSaving}>
              Update email
            </Button>
          </div>
        </form>
      </div>

      <div className="settings-section__subcard">
        <form onSubmit={handlePasswordChange}>
          <h3 className="settings-section__subtitle">
            <LockIcon /> Password
          </h3>
          <div className="settings-section__form">
            {passwordError ? (
              <p className="auth__alert" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? <p className="profile-edit__saved">{passwordMessage}</p> : null}
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters"
              required
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button as="button" type="submit" variant="secondary" size="sm" loading={passwordSaving}>
              Update password
            </Button>
          </div>
        </form>
      </div>

      <div className="settings-section__subcard">
        <h3 className="settings-section__subtitle">
          <MonitorIcon /> Sessions
        </h3>
        <p className="settings__body">
          If you think your account may be signed in somewhere you don&apos;t recognise, sign out of every
          device at once.
        </p>
        {signOutMessage ? <p className="profile-edit__saved">{signOutMessage}</p> : null}
        <div className="settings-section__form">
          <Button
            as="button"
            type="button"
            variant="secondary"
            size="sm"
            loading={signingOutEverywhere}
            onClick={handleSignOutEverywhere}
          >
            Sign out everywhere
          </Button>
        </div>
      </div>
    </section>
  );
}

function RegionLanguageSection() {
  const state = useLearner();
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('en');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (state.status === 'ready' && !initialized) {
      setCountry(state.learner.profile.country ?? '');
      setLanguage(
        typeof state.learner.profile.preferences.language === 'string'
          ? (state.learner.profile.preferences.language as string)
          : 'en',
      );
      setInitialized(true);
    }
  }, [state, initialized]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (state.status !== 'ready') return;
    setError(undefined);
    setSaved(false);
    setSaving(true);
    try {
      await Promise.all([
        apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ country: country || undefined }) }),
        apiFetch('/me/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ preferences: { ...state.learner.profile.preferences, language } }),
        }),
      ]);
      state.refetch();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="preferences" className="settings-section" data-reveal>
      <div className="settings-section__head">
        <span className="settings-section__icon">
          <GlobeIcon />
        </span>
        <h2 className="settings-section__title">Preferences</h2>
      </div>
      <form className="settings-section__form" onSubmit={handleSave}>
        {error ? (
          <p className="auth__alert" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? <p className="profile-edit__saved">Saved.</p> : null}
        <SelectField
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          options={COUNTRY_OPTIONS}
          hint="Used to resolve course pricing to your local currency."
        />
        <SelectField label="Preferred language" value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGE_OPTIONS} />
        <Button as="button" type="submit" variant="secondary" size="sm" loading={saving}>
          Save preferences
        </Button>
      </form>
    </section>
  );
}

function DangerZoneSection() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setError(undefined);
    setDeleting(true);
    try {
      await apiFetch('/me', { method: 'DELETE' });
      await signOut();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account.');
      setDeleting(false);
    }
  }

  return (
    <section id="danger-zone" className="settings-section settings-section--danger" data-reveal>
      <div className="settings-section__head">
        <span className="settings-section__icon">
          <TrashIcon />
        </span>
        <h2 className="settings-section__title">Danger zone</h2>
      </div>
      <p className="settings__body">
        This marks your account for deletion. It does not immediately erase your data.
      </p>
      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      {!confirming ? (
        <div className="settings-section__form">
          <Button as="button" type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>
            Delete my account
          </Button>
        </div>
      ) : (
        <div className="settings-section__confirm">
          <p className="settings__body">
            Type <strong>DELETE</strong> to confirm. This cannot be undone from here.
          </p>
          <TextField
            label="Confirmation"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="settings-section__confirm-actions">
            <Button
              as="button"
              type="button"
              variant="destructive"
              size="sm"
              disabled={confirmText !== 'DELETE'}
              loading={deleting}
              onClick={handleDelete}
            >
              Confirm deletion
            </Button>
            <Button as="button" type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

