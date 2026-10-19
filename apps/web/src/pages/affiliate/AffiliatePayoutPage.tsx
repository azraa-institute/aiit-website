import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AffiliateMe, AffiliatePayoutMethod } from '@aiit/shared';
import { cn } from '@/lib/cn';
import { apiFetch, ApiError } from '@/lib/api';
import { useApiFetch } from '@/lib/useApiFetch';
import { COUNTRIES } from '@/data/countries';
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

/** Paystack has a live bank directory for exactly these four countries (see PaymentsService.listBanksForCountry) -- everywhere else falls back to a free-text bank name. */
const BANK_LIST_COUNTRIES = new Set(['NG', 'GH', 'KE', 'ZA']);

const COUNTRIES_SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

/** Matches a saved free-text bankCountry (every record before this dropdown existed, e.g. "Nigeria" or "India") back to its ISO code so the select can preselect it. Empty if it was never set or doesn't match any known country name. */
function detectCountryCode(bankCountry: string | undefined): string {
  const v = (bankCountry ?? '').trim().toLowerCase();
  if (!v) return '';
  return COUNTRIES.find((c) => c.name.toLowerCase() === v || c.code.toLowerCase() === v)?.code ?? '';
}

function maskAccountNumber(value: string): string {
  const digits = value.replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

/** Must contain at least one letter from any script -- rejects a pure number/symbol string (e.g. a phone number pasted into "Account holder name" by mistake) without assuming a particular alphabet, so it doesn't reject real names written in scripts outside basic Latin. */
const CONTAINS_A_LETTER = '.*\\p{L}.*';

function payoutSummaryLine(details: NonNullable<AffiliateMe['payoutDetails']>): string {
  if (details.method === 'paypal') return `PayPal: ${details.paypalEmail ?? ''}`;
  const masked = details.bankAccountNumber ? maskAccountNumber(details.bankAccountNumber) : '';
  return `Bank transfer: ${details.bankName ?? ''} (${masked}), ${details.bankCountry ?? ''}`;
}

/**
 * Where to actually send money -- self-reported, admin-visible only. No
 * live payout integration exists (see AffiliatesService.updatePayoutDetails's
 * doc comment): an admin pays manually via whichever method this points at,
 * then records it in the admin portal, which is what moves registrationCount
 * x rate - payout history. India gets a field layout matching its actual
 * bank-transfer convention (IFSC); Nigeria/Ghana/Kenya/South Africa get a
 * live bank-name dropdown from Paystack's bank directory (see
 * PaymentsService.listBanksForCountry); anywhere else falls back to fully
 * generic free-text fields.
 */
function PayoutDetailsForm({ details, onSaved }: { details: AffiliateMe['payoutDetails']; onSaved: (me: AffiliateMe) => void }) {
  const [method, setMethod] = useState<AffiliatePayoutMethod>(details?.method ?? 'paypal');
  const [paypalEmail, setPaypalEmail] = useState(details?.paypalEmail ?? '');
  const [countryCode, setCountryCode] = useState(() => detectCountryCode(details?.bankCountry));
  const [bankAccountName, setBankAccountName] = useState(details?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(details?.bankAccountNumber ?? '');
  const [bankName, setBankName] = useState(details?.bankName ?? '');
  const [bankCode, setBankCode] = useState(details?.bankCode ?? '');
  const [revealAccountNumber, setRevealAccountNumber] = useState(!details);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  // First-time entry opens straight into the form (there's nothing to show
  // a summary of yet); once details exist, they're shown closed/read-only
  // until "Edit payout details" is clicked, rather than always sitting open.
  const [editing, setEditing] = useState(!details);

  const hasExistingDetails = Boolean(details);

  const banksPath = BANK_LIST_COUNTRIES.has(countryCode) ? `/affiliates/banks?country=${countryCode}` : null;
  const banksState = useApiFetch<{ name: string; code: string }[] | null>(banksPath);
  const bankOptions = banksState.status === 'ready' ? banksState.data : null;
  const hasBankList = Boolean(bankOptions && bankOptions.length > 0);

  function resetConfirm() {
    setConfirmChange(false);
    setSaved(false);
  }

  function onCountryChange(code: string) {
    setCountryCode(code);
    // A bank picked under the old country no longer means anything once the
    // list it came from (or the free-text convention, for IFSC/sort code)
    // has changed out from under it.
    setBankName('');
    setBankCode('');
    resetConfirm();
  }

  function onSelectBank(name: string) {
    setBankName(name);
    setBankCode(bankOptions?.find((b) => b.name === name)?.code ?? '');
    resetConfirm();
  }

  async function save() {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const resolvedBankCountry = COUNTRIES.find((c) => c.code === countryCode)?.name ?? '';
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
      setEditing(false);
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

  /** Discards any unsaved edits and goes back to the read-only summary -- the saved `details` are untouched either way, this only resets the form's own local state back to them. */
  function cancelEdit() {
    if (!details) return;
    setMethod(details.method);
    setPaypalEmail(details.paypalEmail ?? '');
    setCountryCode(detectCountryCode(details.bankCountry));
    setBankAccountName(details.bankAccountName ?? '');
    setBankAccountNumber(details.bankAccountNumber ?? '');
    setBankName(details.bankName ?? '');
    setBankCode(details.bankCode ?? '');
    setRevealAccountNumber(false);
    setError(undefined);
    setConfirmChange(false);
    setEditing(false);
  }

  if (!editing && details) {
    return (
      <section className="aff-card">
        <h2>Payout details</h2>
        <p>{payoutSummaryLine(details)}</p>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing(true)}>
            Edit payout details
          </button>
        </div>
      </section>
    );
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
                  required
                  value={countryCode}
                  onChange={(e) => onCountryChange(e.target.value)}
                >
                  <option value="" disabled>
                    Select a country…
                  </option>
                  {COUNTRIES_SORTED.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>Account holder name</span>
                <input
                  required
                  minLength={2}
                  pattern={CONTAINS_A_LETTER}
                  title="Enter the account holder's actual name, not a number."
                  value={bankAccountName}
                  onChange={(e) => {
                    setBankAccountName(e.target.value);
                    resetConfirm();
                  }}
                />
              </label>

              {hasBankList ? (
                <label className="adm-field">
                  <span>Bank name</span>
                  <select required value={bankName} onChange={(e) => onSelectBank(e.target.value)}>
                    <option value="">Select a bank…</option>
                    {bankOptions?.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="adm-field">
                  <span>Bank name</span>
                  <input
                    required
                    minLength={2}
                    pattern={CONTAINS_A_LETTER}
                    title="Enter the bank's actual name, not a number."
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      resetConfirm();
                    }}
                  />
                </label>
              )}

              <label className="adm-field aff-masked-field">
                <span>Account number{countryCode === 'NG' ? ' (NUBAN, 10 digits)' : ''}</span>
                <span className="aff-masked-field__row">
                  <input
                    type="text"
                    required
                    inputMode={countryCode === 'NG' ? 'numeric' : 'text'}
                    pattern={countryCode === 'NG' ? '\\d{10}' : undefined}
                    title={countryCode === 'NG' ? 'A 10-digit NUBAN account number' : undefined}
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

              {countryCode === 'IN' ? (
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
              ) : !hasBankList ? (
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
          ) : hasExistingDetails ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={cancelEdit} disabled={saving}>
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
