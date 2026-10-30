import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AffiliateMe } from '@aiit/shared';
import { PASSWORD_HINT, passwordMeetsRequirements, PasswordRequirementsList } from '@/components/common/PasswordRequirements';
import { apiFetch, ApiError } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useAffiliateMe } from './affiliateData';
import './affiliate-portal.css';

function ChangePasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    if (!passwordMeetsRequirements(password)) {
      setError(PASSWORD_HINT);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('This is not configured yet.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirm('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="aff-card">
      <h2>Change your password</h2>
      <p>You&apos;re already signed in, so no current password is needed, just choose a new one.</p>
      <form onSubmit={onSubmit}>
        <div className="adm-grid">
          <label className="adm-field">
            <span>New password</span>
            <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Confirm new password</span>
            <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
        </div>
        <PasswordRequirementsList password={password} />
        {error ? (
          <p className="adm-error" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="adm-notice" role="status">
            Password changed.
          </p>
        ) : null}
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ContactDetailsCard({ data, onSaved }: { data: AffiliateMe; onSaved: (me: AffiliateMe) => void }) {
  const [phone, setPhone] = useState(data.phone ?? '');
  const [handle, setHandle] = useState(data.handle ?? '');
  const [country, setCountry] = useState(data.country ?? '');
  const [state, setState] = useState(data.state ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [motivation, setMotivation] = useState(data.motivation ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const me = await apiFetch<AffiliateMe>('/affiliates/me/contact', {
        method: 'PUT',
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          handle: handle.trim() || undefined,
          country: country.trim() || undefined,
          state: state.trim() || undefined,
          city: city.trim() || undefined,
          motivation: motivation.trim() || undefined,
        }),
      });
      onSaved(me);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="aff-card">
      <h2>Your contact details</h2>
      <p>What you told us when you applied. Keep it current so the AIIT team can reach you.</p>
      <form onSubmit={onSubmit}>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Social handle / channel</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Country</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>State / region</span>
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>About you / your audience</span>
            <textarea rows={3} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
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
            {saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AffiliateSettingsPage() {
  const state = useAffiliateMe();

  if (state.status === 'loading') return <p className="aff-loading">Loading…</p>;
  if (state.status === 'error') {
    return (
      <p className="aff-error" role="alert">
        {state.error.message}
      </p>
    );
  }

  return (
    <div className="aff-dash">
      <ChangePasswordCard />
      <ContactDetailsCard data={state.data} onSaved={() => state.refetch()} />
    </div>
  );
}
