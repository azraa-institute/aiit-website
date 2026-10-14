import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AffiliateMe, AffiliatePayoutMethod } from '@aiit/shared';
import { cn } from '@/lib/cn';
import { apiFetch, ApiError } from '@/lib/api';
import { useAffiliateMe } from './affiliateData';
import { formatCents } from './affiliateFormat';
import './affiliate-portal.css';

/** Original marks (not the real PayPal logo -- a trademark/copyright risk on a page
 * we author ourselves), just enough to tell the two payout methods apart at a glance. */
function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="14.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 22 8H2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 8v10M9 8v10M15 8v10M20 8v10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 21.5h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1 8s2.7-4.5 7-4.5S15 8 15 8s-2.7 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2l12 12M1 8s2.7-4.5 7-4.5c1 0 1.9.2 2.7.5M15 8s-1 1.8-2.8 3M6.2 6.2a2 2 0 0 0 2.8 2.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Moniepoint MFB',
  'Opay',
  'Palmpay',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank Nigeria',
  'Sterling Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
];

type BankCountryChoice = 'IN' | 'NG' | 'other';

function detectCountryChoice(bankCountry: string | undefined): BankCountryChoice {
  const v = (bankCountry ?? '').trim().toLowerCase();
  if (v === 'india' || v === 'in') return 'IN';
  if (v === 'nigeria' || v === 'ng') return 'NG';
  return 'other';
}

function maskAccountNumber(value: string): string {
  const digits = value.replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

/**
 * Where to actually send money -- self-reported, admin-visible only. No
 * live payout integration exists (see AffiliatesService.updatePayoutDetails's
 * doc comment): an admin pays manually via whichever method this points at,
 * then records it in the admin portal, which is what moves registrationCount
 * x rate - payout history. India/Nigeria get field layouts matching their
 * actual bank-transfer conventions (IFSC vs. NUBAN); anything else falls
 * back to fully generic free-text fields.
 */
function PayoutDetailsForm({ details, onSaved }: { details: AffiliateMe['payoutDetails']; onSaved: (me: AffiliateMe) => void }) {
  const [method, setMethod] = useState<AffiliatePayoutMethod>(details?.method ?? 'paypal');
  const [paypalEmail, setPaypalEmail] = useState(details?.paypalEmail ?? '');
  const [countryChoice, setCountryChoice] = useState<BankCountryChoice>(detectCountryChoice(details?.bankCountry));
  const [bankCountry, setBankCountry] = useState(details?.bankCountry ?? '');
  const [bankAccountName, setBankAccountName] = useState(details?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(details?.bankAccountNumber ?? '');
  const [bankName, setBankName] = useState(details?.bankName ?? '');
  const [bankCode, setBankCode] = useState(details?.bankCode ?? '');
  const [revealAccountNumber, setRevealAccountNumber] = useState(!details);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);

  const hasExistingDetails = Boolean(details);

  function resetConfirm() {
    setConfirmChange(false);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const resolvedBankCountry = countryChoice === 'IN' ? 'India' : countryChoice === 'NG' ? 'Nigeria' : bankCountry.trim();
      const me = await apiFetch<AffiliateMe>('/affiliates/me/payout', {
        method: 'PUT',
        body: JSON.stringify(
          method === 'paypal'
            ? { method, paypalEmail: paypalEmail.trim() }
            : {
                method,
                bankCountry: resolvedBankCountry,
                bankAccountName: bankAccountName.trim(),
                bankAccountNumber: bankAccountNumber.trim(),
                bankName: bankName.trim(),
                bankCode: bankCode.trim(),
              },
        ),
      });
      onSaved(me);
      setSaved(true);
      setRevealAccountNumber(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your payout details.');
    } finally {
      setSaving(false);
      setConfirmChange(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Changing where real money goes takes a second click once details already exist --
    // first-time entry saves straight away.
    if (hasExistingDetails && !confirmChange) {
      setConfirmChange(true);
      return;
    }
    void save();
  }

  return (
    <section className="aff-card">
      <h2>Payout details</h2>
      <p>
        Where should AIIT send your earnings? This is reviewed by the AIIT team, who pay out on the agreed schedule --
        it doesn&apos;t connect to a live payment account automatically.
      </p>
      <form className="adm-form" onSubmit={onSubmit}>
        <div className="aff-method-picker" role="radiogroup" aria-label="Payout method">
          <button
            type="button"
            role="radio"
            aria-checked={method === 'paypal'}
            className={cn('aff-method-card', method === 'paypal' && 'is-selected')}
            onClick={() => {
              setMethod('paypal');
              resetConfirm();
            }}
          >
            <WalletIcon />
            <span>PayPal</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={method === 'bank'}
            className={cn('aff-method-card', method === 'bank' && 'is-selected')}
            onClick={() => {
              setMethod('bank');
              resetConfirm();
            }}
          >
            <BankIcon />
            <span>Bank transfer</span>
          </button>
        </div>

        <div className="adm-grid">
          {method === 'paypal' ? (
            <label className="adm-field adm-field--wide">
              <span>PayPal email</span>
              <input
                type="email"
                required
                value={paypalEmail}
                onChange={(e) => {
                  setPaypalEmail(e.target.value);
                  resetConfirm();
                }}
              />
            </label>
          ) : (
            <>
              <label className="adm-field">
                <span>Bank country</span>
                <select
                  value={countryChoice}
                  onChange={(e) => {
                    setCountryChoice(e.target.value as BankCountryChoice);
                    resetConfirm();
                  }}
                >
                  <option value="IN">India</option>
                  <option value="NG">Nigeria</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {countryChoice === 'other' ? (
                <label className="adm-field">
                  <span>Country your bank is in</span>
                  <input
                    required
                    value={bankCountry}
                    onChange={(e) => {
                      setBankCountry(e.target.value);
                      resetConfirm();
                    }}
                  />
                </label>
              ) : null}
              <label className="adm-field">
                <span>Account holder name</span>
                <input
                  required
                  value={bankAccountName}
                  onChange={(e) => {
                    setBankAccountName(e.target.value);
                    resetConfirm();
                  }}
                />
              </label>

              {countryChoice === 'NG' ? (
                <label className="adm-field">
                  <span>Bank name</span>
                  <select
                    required
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      resetConfirm();
                    }}
                  >
                    <option value="">Select a bank…</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="adm-field">
                  <span>Bank name</span>
                  <input
                    required={countryChoice === 'IN'}
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      resetConfirm();
                    }}
                  />
                </label>
              )}

              <label className="adm-field aff-masked-field">
                <span>Account number{countryChoice === 'NG' ? ' (NUBAN, 10 digits)' : ''}</span>
                <span className="aff-masked-field__row">
                  <input
                    type="text"
                    required
                    inputMode={countryChoice === 'NG' ? 'numeric' : 'text'}
                    pattern={countryChoice === 'NG' ? '\\d{10}' : undefined}
                    title={countryChoice === 'NG' ? 'A 10-digit NUBAN account number' : undefined}
                    value={revealAccountNumber ? bankAccountNumber : maskAccountNumber(bankAccountNumber)}
                    onFocus={() => setRevealAccountNumber(true)}
                    onChange={(e) => {
                      setBankAccountNumber(e.target.value);
                      resetConfirm();
                    }}
                  />
                  <button
                    type="button"
                    className="aff-masked-field__toggle"
                    onClick={() => setRevealAccountNumber((v) => !v)}
                    aria-label={revealAccountNumber ? 'Hide account number' : 'Show account number'}
                  >
                    <EyeIcon open={revealAccountNumber} />
                  </button>
                </span>
              </label>

              {countryChoice === 'IN' ? (
                <label className="adm-field adm-field--wide">
                  <span>IFSC code</span>
                  <input
                    required
                    pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                    title="11-character IFSC code, e.g. SBIN0001234"
                    placeholder="SBIN0001234"
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value.toUpperCase());
                      resetConfirm();
                    }}
                  />
                </label>
              ) : countryChoice === 'other' ? (
                <label className="adm-field adm-field--wide">
                  <span>IFSC / sort code / routing number / SWIFT (whichever your bank uses)</span>
                  <input
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value);
                      resetConfirm();
                    }}
                  />
                </label>
              ) : null}
            </>
          )}
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
        {confirmChange ? (
          <p className="adm-error" role="alert">
            This changes where AIIT sends your earnings. Click again to confirm.
          </p>
        ) : null}
        <div className="adm-actions">
          <button type="submit" className={cn('adm-btn', confirmChange ? 'adm-btn--danger' : 'adm-btn--primary')} disabled={saving}>
            {saving ? 'Saving…' : confirmChange ? 'Yes, update payout details' : hasExistingDetails ? 'Update payout details' : 'Save payout details'}
          </button>
          {confirmChange ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmChange(false)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function PayoutHistory({ payouts }: { payouts: AffiliateMe['payouts'] }) {
  if (payouts.length === 0) {
    return (
      <section className="aff-card">
        <h2>Payout history</h2>
        <p>No payouts recorded yet.</p>
      </section>
    );
  }
  return (
    <section className="aff-card">
      <h2>Payout history</h2>
      <ul className="aff-payout-history" role="list">
        {payouts.map((p) => (
          <li key={p.id}>
            <span className="aff-payout-history__amount">{formatCents(p.amountCents)}</span>
            <span className="aff-payout-history__date">{new Date(p.paidAt).toLocaleDateString()}</span>
            {p.note ? <span className="aff-payout-history__note">{p.note}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AffiliatePayoutPage() {
  const state = useAffiliateMe();

  if (state.status === 'loading') return <p className="aff-loading">Loading…</p>;
  if (state.status === 'error') {
    return (
      <p className="aff-error" role="alert">
        {state.error.message}
      </p>
    );
  }

  const { data } = state;
  return (
    <div className="aff-dash">
      <PayoutDetailsForm details={data.payoutDetails} onSaved={() => state.refetch()} />
      <PayoutHistory payouts={data.payouts} />
    </div>
  );
}
