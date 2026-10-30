import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { AffiliateAgreement, AffiliateSocialPlatform, AffiliateType, GeoCity, GeoState } from '@aiit/shared';
import { Layout } from '@/components/layout/Layout';
import { Logo } from '@/components/layout/Logo';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useInView } from '@/lib/useInView';
import { useAnimatedNumber, useCountUpOnce } from '@/lib/useAnimatedNumber';
import { AFFILIATE } from '@/data/blueprint';
import { SITE } from '@/data/site';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { TextField, SelectField, TextArea, CheckboxGroupField } from '@/components/common/Field';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { apiFetch, ApiError } from '@/lib/api';
import { useMe } from '@/lib/me';
import { COUNTRIES } from '@/data/countries';
import { fetchStates, fetchCities } from '@/lib/geo';
import { combinePhone } from '@/lib/phone';
import { getPendingReferralSlug, clearPendingReferralSlug } from '@/lib/referralAttribution';
import { PhoneCountrySelect } from './portal/PhoneCountrySelect';
import { useAffiliateMe } from './affiliate/affiliateData';
import { AffiliateNetwork } from './AffiliateNetwork';
import { cn } from '@/lib/cn';
import './affiliate-page.css';

const ALREADY_REGISTERED_MESSAGE = 'An account with this email already exists. Please sign in, then apply from this page.';

// Same free-text-but-canonical-list convention as the student Profile/Settings
// country field (SettingsPage.tsx's COUNTRY_OPTIONS) -- the backend stores
// whatever string is sent (Affiliate.country, see schema.prisma), so this
// sends the country's name, not its ISO code, to keep admin-facing display
// plain. Using the same COUNTRIES list the rest of the site uses is the
// actual fix for "the country list doesn't match the student side".
const COUNTRY_OPTIONS = [{ value: '', label: 'Select a country' }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))];

// Checklist, not a single-select -- an applicant can hold any combination
// (e.g. direct referrer + affiliate-to-affiliate). 'student' is the public-
// facing label for the direct-referrer type (AffiliateType's own 'student'
// value, kept as-is server-side -- see packages/shared/src/affiliate.ts).
const AFFILIATE_TYPE_OPTIONS: { value: AffiliateType; label: string }[] = [
  { value: 'student', label: 'Direct student referrer (refers students directly)' },
  { value: 'creator', label: 'Creator (introduces content creators to AIIT)' },
  { value: 'affiliate_to_affiliate', label: 'Affiliate-to-affiliate (brings in other affiliates)' },
];

const SOCIAL_PLATFORM_OPTIONS: { value: AffiliateSocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Other' },
];
const MAX_SOCIAL_LINKS = 5;

const SOCIAL_PLATFORM_PLACEHOLDERS: Record<AffiliateSocialPlatform, string> = {
  instagram: 'instagram.com/yourhandle',
  tiktok: 'tiktok.com/@yourhandle',
  youtube: 'youtube.com/@yourchannel',
  x: 'x.com/yourhandle',
  linkedin: 'linkedin.com/in/yourname',
  facebook: 'facebook.com/yourpage',
  other: 'yourwebsite.com',
};

function socialPlatformLabel(platform: AffiliateSocialPlatform): string {
  return SOCIAL_PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? platform;
}

interface SocialLinkRow {
  platform: AffiliateSocialPlatform;
  url: string;
  followers: string;
}

function emptySocialLinkRow(): SocialLinkRow {
  return { platform: 'instagram', url: '', followers: '' };
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckBadgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="3" width="6" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.5h7M8.5 16h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 12h7M8.5 15.5h7M8.5 19h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5l6.5 2.6v5.4c0 4.4-2.8 7.9-6.5 9-3.7-1.1-6.5-4.6-6.5-9V6.1L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.6 12.4l2.3 2.3 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0l-5-5m5 5l5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Subtle decorative mark for the agreement header -- a signed page and a
    verified-partner badge, echoing the shield used in the notice panel
    below. Purely ornamental (aria-hidden), hidden on narrow screens where
    there's no room for it beside the heading (see affiliate-page.css). */
function AgreementArt() {
  return (
    <svg className="affiliate-agreement__art" viewBox="0 0 200 170" aria-hidden="true">
      <g transform="rotate(-7 75 90)">
        <rect x="32" y="18" width="92" height="124" rx="9" fill="var(--ivory-deep)" stroke="var(--line)" />
      </g>
      <g transform="rotate(5 110 90)">
        <rect x="72" y="12" width="96" height="128" rx="9" fill="var(--surface)" stroke="var(--line-strong)" />
        <line x1="87" y1="38" x2="152" y2="38" stroke="var(--line-strong)" strokeWidth="2" />
        <line x1="87" y1="52" x2="152" y2="52" stroke="var(--line)" strokeWidth="2" />
        <line x1="87" y1="66" x2="142" y2="66" stroke="var(--line)" strokeWidth="2" />
        <line x1="87" y1="80" x2="152" y2="80" stroke="var(--line)" strokeWidth="2" />
        <line x1="87" y1="94" x2="132" y2="94" stroke="var(--line)" strokeWidth="2" />
        <path d="M87 116q8-13 16 0t16 0t16-5" fill="none" stroke="var(--brass-deep)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g transform="translate(142 120)">
        <circle r="23" fill="var(--brass)" />
        <path d="M-8.5 -1.5l5.5 6 12-13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g fill="var(--brass-tint)">
        <path d="M24 28l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
        <circle cx="176" cy="44" r="2.5" />
        <circle cx="28" cy="104" r="2" />
      </g>
    </svg>
  );
}

/** "1. Parties" -> { number: "1", title: "Parties" }; "6A. Affiliate-to-
    Affiliate Commission" -> { number: "6A", title: "..." }. The backend's
    AFFILIATE_AGREEMENT_SECTIONS headings already carry their own clause
    number as plain text (see affiliate-agreement.ts) -- this only splits it
    out for the circular marker, it doesn't change what's sent or stored. */
function splitClauseHeading(heading: string): { number: string; title: string } {
  const match = heading.match(/^(\S+)\.\s+(.+)$/);
  return match ? { number: match[1], title: match[2] } : { number: '', title: heading };
}

type ClauseBlock = { type: 'p'; text: string } | { type: 'list'; items: string[] };

/** Groups consecutive "• ..." paragraphs (the agreement source's own plain-
    text bullet convention, e.g. Clause 3's eligible-categories list) into a
    real list block so they render as proper <li> bullets instead of a
    literal "•" character -- same words, same order, just a cleaner marker. */
function groupClauseParagraphs(paragraphs: string[]): ClauseBlock[] {
  const blocks: ClauseBlock[] = [];
  for (const para of paragraphs) {
    if (para.startsWith('• ')) {
      const item = para.slice(2);
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
    } else {
      blocks.push({ type: 'p', text: para });
    }
  }
  return blocks;
}

/** agreement.version is the ISO date the legal text was last revised (see
    AFFILIATE_AGREEMENT_VERSION in affiliate-agreement.ts) -- real metadata
    from the API response, not a placeholder. */
function formatAgreementDate(version: string): string {
  const date = new Date(version);
  if (Number.isNaN(date.getTime())) return version;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The "Print / Save as PDF" button's actual printable content, rendered via
 * a portal straight onto <body> (outside #root) rather than printed in
 * place. The interactive document panel sits inside several nested
 * scroll/overflow containers (.affiliate-agreement__text's own scrollbar,
 * card radii, etc.) -- asking the browser to print that subtree in place
 * produced a blank page, since those ancestors' box/overflow rules don't
 * resolve the same way under print layout. A sibling of #root, hidden by
 * default and shown only in @media print (which also hides #root), sidesteps
 * all of that: what prints is simple, independent, top-level flow content.
 *
 * Styled to match the letterhead of the real, generated PDF an approved
 * affiliate downloads from their dashboard (see
 * apps/api/.../affiliate-agreement-pdf.service.ts's drawLetterhead()) --
 * same institute letterhead block, title and clause treatment -- but this
 * is the pre-signature reference copy a visitor reads before applying, so
 * it stops short of that PDF's signature block, seal and per-affiliate
 * reference code: there's nothing to sign or stamp yet.
 */
function AgreementPrintSheet({ agreement }: { agreement: AffiliateAgreement }) {
  return createPortal(
    <div className="affiliate-agreement__print-sheet">
      <div className="affiliate-agreement__print-letterhead">
        <Logo variant="dark" className="affiliate-agreement__print-logo" />
        <p className="affiliate-agreement__print-org">Azraa Institute of Information Technology (AIIT)</p>
        <p className="affiliate-agreement__print-meta">AIIT Academy · www.aiit.network</p>
        <p className="affiliate-agreement__print-meta">
          36, Farook Nagar 1st Cross, Kovaipudur, Coimbatore – 641042, Tamil Nadu, India
        </p>
        <div className="affiliate-agreement__print-rule" />
        <h1>Individual Partner Referral Agreement</h1>
        <p className="affiliate-agreement__print-subtitle">Student Acquisition, Content Creator &amp; Affiliate Partnership</p>
        <p className="affiliate-agreement__print-meta">
          Reference copy for review · Version {formatAgreementDate(agreement.version)} · Unsigned
        </p>
      </div>
      {agreement.sections.map((section) => (
        <div key={section.heading} className="affiliate-agreement__print-clause">
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ))}
      <p className="affiliate-agreement__print-footer">
        This is a reference copy for your own review, not a signed agreement. You sign electronically, by typed
        name and the agreement checkbox, as part of the application itself.
      </p>
    </div>,
    document.body,
  );
}

/** One rate figure with a count-up-on-reveal animated number. */
function RateFigure({
  value,
  label,
  kicker,
  variant,
  active,
  delay,
}: {
  value: number;
  label: string;
  kicker: string;
  variant: 'creator' | 'direct' | 'milestone';
  active: boolean;
  delay: number;
}) {
  const shown = useCountUpOnce(value, active, 900);
  return (
    <div
      className={cn('affiliate-rate', `affiliate-rate--${variant}`)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="affiliate-rate__kicker">{kicker}</p>
      <p className="affiliate-rate__value">
        <span>$</span>
        {shown}
      </p>
      <p className="affiliate-rate__label">{label}</p>
    </div>
  );
}

/** A pathway's mini flow — a labelled sequence of steps ending in the payout. */
function PathwayFlow({ steps, reward }: { steps: string[]; reward: string }) {
  return (
    <ol className="pathway-flow" role="list">
      {steps.map((s) => (
        <li key={s}>{s}</li>
      ))}
      <li className="pathway-flow__reward">{reward}</li>
    </ol>
  );
}

export default function AffiliatePage() {
  const a = AFFILIATE;
  const [count, setCount] = useState(39);
  const [hoveredWay, setHoveredWay] = useState<number | null>(null);
  useScrollReveal();

  const me = useMe();
  const isLoggedIn = me.status === 'ready';
  const affiliateMe = useAffiliateMe();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [handle, setHandle] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinkRow[]>([emptySocialLinkRow()]);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('');
  const [motivation, setMotivation] = useState('');
  const [types, setTypes] = useState<AffiliateType[]>([]);
  const [affiliateCouponCode, setAffiliateCouponCode] = useState('');
  // Deliberately its own field, not pre-filled from `name` -- typing it is
  // the actual signing gesture (see onSubmit), the same convention real
  // e-signature platforms use even when a name is already on file.
  const [signedName, setSignedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  // Country -> State -> City cascade -- same pattern as the student portal's
  // ProfileCompletionWizard.tsx/ProfilePage.tsx (state/city stay plain text,
  // the selected state's id is looked up by name rather than tracked
  // separately). `country` here is deliberately still the country's full
  // name, not its ISO code (see COUNTRY_OPTIONS's own comment on why), so
  // the geo lookups go through a derived code rather than `country` itself.
  const [states, setStates] = useState<GeoState[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const countryCode = COUNTRIES.find((c) => c.name === country)?.code;

  const prevCountryCode = useRef(countryCode);
  useEffect(() => {
    if (prevCountryCode.current !== countryCode) {
      setState('');
      setCity('');
    }
    prevCountryCode.current = countryCode;
    if (!countryCode) {
      setStates([]);
      return;
    }
    setStatesLoading(true);
    fetchStates(countryCode)
      .then(setStates)
      .catch(() => setStates([]))
      .finally(() => setStatesLoading(false));
  }, [countryCode]);

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
  const [done, setDone] = useState(false);

  // The agreement's legal text, fetched fresh rather than hardcoded on this
  // page -- apps/api's affiliate-agreement.ts is the one place it's
  // actually written, so it can never drift from what's embedded in the
  // signed PDF (see that file's own doc comment).
  const [agreement, setAgreement] = useState<AffiliateAgreement>();
  const [agreementError, setAgreementError] = useState<string>();
  useEffect(() => {
    apiFetch<AffiliateAgreement>('/affiliates/agreement')
      .then(setAgreement)
      .catch(() => setAgreementError('Could not load the agreement text right now. You can still apply below.'));
  }, []);

  // Tiered, not flat: the first 500 direct referrals earn $7 each; only
  // referrals beyond 500 earn the $10 milestone rate (AFFILIATE.rates) —
  // the first 500 are never retroactively repriced at $10.
  const MILESTONE = 500;
  const BASE_RATE = 7;
  const MILESTONE_RATE = 10;
  const rawEstimate =
    count <= MILESTONE
      ? count * BASE_RATE
      : MILESTONE * BASE_RATE + (count - MILESTONE) * MILESTONE_RATE;
  const estimate = useAnimatedNumber(rawEstimate, 350);
  const CALCULATOR_MAX = 1000;

  const [heroRef, heroActive] = useInView<HTMLDivElement>(0.3);
  const [ratesRef, ratesActive] = useInView<HTMLDivElement>(0.4);
  const [step1Ref, step1On] = useInView<HTMLLIElement>(0.5);
  const [step2Ref, step2On] = useInView<HTMLLIElement>(0.5);
  const [step3Ref, step3On] = useInView<HTMLLIElement>(0.5);
  const [step4Ref, step4On] = useInView<HTMLLIElement>(0.5);
  const stepRefs = [step1Ref, step2Ref, step3Ref, step4Ref];
  const stepOn = [step1On, step2On, step3On, step4On];

  function updateSocialLink(index: number, patch: Partial<SocialLinkRow>) {
    setSocialLinks((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addSocialLink() {
    setSocialLinks((rows) => (rows.length >= MAX_SOCIAL_LINKS ? rows : [...rows, emptySocialLinkRow()]));
  }
  function removeSocialLink(index: number) {
    setSocialLinks((rows) => rows.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      // Only rows with a URL actually filled in are sent -- an added-then-
      // abandoned row (or the default empty first row, for an applicant who
      // never touches this section) is just dropped, not sent as an empty
      // entry for the backend to reject.
      const socialLinksPayload = socialLinks
        .filter((row) => row.url.trim())
        .map((row) => ({
          platform: row.platform,
          url: row.url.trim(),
          ...(row.followers.trim() ? { followersReported: Number(row.followers.trim()) } : {}),
        }));

      const shared = {
        types,
        signedName: signedName.trim(),
        agreedToTerms: agreed,
        phone: combinePhone(phoneCountry, phoneNational) || undefined,
        handle: handle || undefined,
        socialLinks: socialLinksPayload.length > 0 ? socialLinksPayload : undefined,
        country: country || undefined,
        state: state || undefined,
        city: city || undefined,
        source: source || undefined,
        motivation: motivation.trim() || undefined,
        affiliateCouponCode: affiliateCouponCode.trim() || undefined,
      };

      if (!isLoggedIn) {
        // No password here -- the account is created server-side with a
        // one-time password, emailed to them alongside a separate reference
        // code (see AffiliatesService.applyNew()). They set their own
        // password the moment they first sign in.
        const referralSlug = getPendingReferralSlug();
        await apiFetch('/affiliates/apply-new', {
          method: 'POST',
          body: JSON.stringify({
            ...shared,
            name: name.trim(),
            email: email.trim(),
            ...(referralSlug ? { referralSlug } : {}),
          }),
        });
        clearPendingReferralSlug();
        setDone(true);
        return;
      }

      await apiFetch('/affiliates/apply', { method: 'POST', body: JSON.stringify(shared) });
      affiliateMe.refetch();
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(ALREADY_REGISTERED_MESSAGE);
      } else {
        setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    types.length > 0 &&
    country.length > 0 &&
    signedName.trim().length > 1 &&
    agreed &&
    socialLinks.every((row) => !row.url.trim() || row.followers.trim().length > 0) &&
    (isLoggedIn || (name.trim().length > 0 && email.trim().length > 0));

  return (
    <Layout>
      <Seo title="Affiliate" description={a.intro} path="/affiliate" />

      {/* ---------- 01 · Hero ---------- */}
      <Section tone="ink" size="lg" className="affiliate-hero">
        <div className="affiliate-hero__atmosphere" aria-hidden="true" />
        <div className="container container--wide affiliate-hero__grid" ref={heroRef}>
          <div className="affiliate-hero__copy" data-reveal>
            <p className="affiliate-hero__eyebrow eyebrow">{a.kicker}</p>
            <h1 className="affiliate-hero__title">{a.title}</h1>
            <p className="affiliate-hero__intro">{a.intro}</p>
            <div className="affiliate-hero__cta-row">
              <Button as="link" to={a.primaryCta.to} size="lg" arrow>
                {a.primaryCta.label}
              </Button>
              <Button as="link" to={a.secondaryCta.to} variant="secondary">
                {a.secondaryCta.label}
              </Button>
            </div>
            <p className="affiliate-hero__signin">
              Already applied? <Link to="/affiliate-portal">Sign in to your affiliate dashboard</Link>.
            </p>
          </div>
          <div className="affiliate-hero__visual">
            <AffiliateNetwork active={heroActive} />
          </div>
        </div>
      </Section>

      {/* ---------- 02 · Earning potential ---------- */}
      <Section id="earn" tone="paper" size="lg">
        <div className="container container--wide" ref={ratesRef}>
          <p className="eyebrow">Your earning potential</p>
          <h2 className="affiliate-section-title">What you earn, at every stage</h2>
          <div className="affiliate-rates" data-active={ratesActive ? '' : undefined}>
            <RateFigure
              variant="creator"
              value={5}
              kicker="Creator referral"
              label="Per student via a creator you introduce"
              active={ratesActive}
              delay={0}
            />
            <span className="affiliate-rates__arrow" aria-hidden="true">
              →
            </span>
            <RateFigure
              variant="direct"
              value={7}
              kicker="Direct referral"
              label="Per student you refer directly"
              active={ratesActive}
              delay={150}
            />
            <span className="affiliate-rates__arrow" aria-hidden="true">
              →
            </span>
            <RateFigure
              variant="milestone"
              value={10}
              kicker="500+ direct referrals"
              label="Once a direct referrer crosses 500 students"
              active={ratesActive}
              delay={300}
            />
            <span className="affiliate-rates__arrow" aria-hidden="true">
              →
            </span>
            <div className="affiliate-rate affiliate-rate--affiliate" style={{ transitionDelay: '450ms' }}>
              <p className="affiliate-rate__kicker">Affiliate-to-affiliate</p>
              <p className="affiliate-rate__value">
                <span>$</span>
                2.50
              </p>
              <p className="affiliate-rate__label">Per affiliate you successfully refer</p>
            </div>
          </div>
          <p className="affiliate-eligibility-note">{a.eligibilityNote}</p>
        </div>
      </Section>

      {/* ---------- 03 · Three ways to earn ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          <p className="eyebrow">How you earn</p>
          <h2 className="affiliate-section-title">{a.waysHeading}</h2>
          <p className="affiliate-section-intro">{a.waysIntro}</p>

          <div
            className="pathways"
            onMouseLeave={() => setHoveredWay(null)}
            data-hovered={hoveredWay ?? undefined}
          >
            {a.ways.map((w, i) => (
              <article
                key={w.title}
                className={cn('pathway', `pathway--${i}`)}
                data-reveal
                onMouseEnter={() => setHoveredWay(i)}
                onFocus={() => setHoveredWay(i)}
                tabIndex={-1}
              >
                <p className="pathway__kicker">{w.kicker}</p>
                <h3 className="pathway__title">{w.title}</h3>
                <p className="pathway__body">{w.body}</p>
                <PathwayFlow steps={w.flowSteps} reward={w.flowReward} />
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------- 04 · Calculator ---------- */}
      <Section tone="paper" size="lg">
        <div className="container container--wide">
          <div className="calculator" data-reveal>
            <div className="calculator__intro">
              <p className="eyebrow">What could you earn?</p>
              <h2 className="affiliate-section-title">Drag to see your potential payout</h2>
              <p className="affiliate-section-intro">
                Drag the slider to see your potential payout at current rates.
              </p>
            </div>

            <div className="calculator__figure">
              <p className="calculator__amount">
                <span className="calculator__currency">$</span>
                {estimate}
              </p>
              <p className="calculator__rate">
                {count <= MILESTONE
                  ? `at $${BASE_RATE} per student · Direct Referral`
                  : `$${BASE_RATE} for your first ${MILESTONE}, $${MILESTONE_RATE} after · Direct Referral`}
              </p>
            </div>

            <div className="calculator__slider">
              <label className="calculator__slider-label" htmlFor="ref-count">
                Students referred
                <strong>{count}</strong>
              </label>
              <input
                id="ref-count"
                type="range"
                min={1}
                max={CALCULATOR_MAX}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ '--fill': `${((count - 1) / (CALCULATOR_MAX - 1)) * 100}%` } as React.CSSProperties}
              />
              <div className="calculator__scale">
                <span>1</span>
                <span>{CALCULATOR_MAX}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 05 · The process ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          <p className="eyebrow">The process</p>
          <h2 className="affiliate-section-title">How it works</h2>

          <ol className="process" role="list">
            {a.steps.map((s, i) => (
              <li
                key={s.index}
                ref={stepRefs[i]}
                className="process__step"
                data-active={stepOn[i] ? '' : undefined}
                style={{ '--step-delay': `${i * 180}ms` } as React.CSSProperties}
              >
                <span className="process__index">{s.index}</span>
                <div className="process__body">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------- 06 · Read the agreement ---------- */}
      <Section id="agreement" tone="paper" size="default">
        <div className="container container--wide">
          <div className="affiliate-agreement" data-reveal>
            <div className="affiliate-agreement__intro">
              <div className="affiliate-agreement__intro-head">
                <span className="affiliate-agreement__intro-icon" aria-hidden="true">
                  <DocumentIcon />
                </span>
                <div className="affiliate-agreement__intro-copy">
                  <p className="eyebrow">Affiliate agreement</p>
                  <h2 className="affiliate-section-title affiliate-agreement__title">Read the Affiliate Agreement</h2>
                </div>
              </div>
              <p className="affiliate-section-intro affiliate-agreement__intro-text">
                This is what you&apos;re agreeing to below: commission structure, eligibility, obligations,
                payment terms, and the rest. You&apos;ll sign it electronically as part of applying, and can download
                your own signed copy afterwards from your affiliate dashboard.
              </p>
              <AgreementArt />
            </div>

            {agreementError ? <p className="affiliate-agreement__error">{agreementError}</p> : null}

            <div className="affiliate-agreement__panel">
              <div className="affiliate-agreement__toolbar">
                <span className="affiliate-agreement__toolbar-icon" aria-hidden="true">
                  <DocumentIcon />
                </span>
                <div className="affiliate-agreement__toolbar-body">
                  <p className="affiliate-agreement__toolbar-title">AIIT Affiliate Agreement</p>
                  <p className="affiliate-agreement__toolbar-hint">Please read the full agreement carefully before proceeding.</p>
                </div>
                {agreement ? (
                  <div className="affiliate-agreement__toolbar-actions">
                    <button type="button" className="affiliate-agreement__print" onClick={() => window.print()}>
                      <DownloadIcon /> Print / Save as PDF
                    </button>
                    <span className="affiliate-agreement__updated">Last updated: {formatAgreementDate(agreement.version)}</span>
                  </div>
                ) : null}
                {agreement ? <AgreementPrintSheet agreement={agreement} /> : null}
              </div>

              <div className="affiliate-agreement__text" tabIndex={0} aria-label="Affiliate Agreement, full text">
                {agreement ? (
                  agreement.sections.map((section) => {
                    const { number, title } = splitClauseHeading(section.heading);
                    return (
                      <div key={section.heading} className="affiliate-agreement__clause">
                        <div className="affiliate-agreement__clause-head">
                          {number ? (
                            <span className="affiliate-agreement__clause-num" aria-hidden="true">
                              {number}
                            </span>
                          ) : null}
                          <h3>{title}</h3>
                          <span className="affiliate-agreement__clause-rule" aria-hidden="true" />
                        </div>
                        {groupClauseParagraphs(section.paragraphs).map((block, i) =>
                          block.type === 'list' ? (
                            <ul key={i}>
                              {block.items.map((item, j) => (
                                <li key={j}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p key={i}>{block.text}</p>
                          ),
                        )}
                      </div>
                    );
                  })
                ) : !agreementError ? (
                  <p className="affiliate-agreement__loading">Loading the agreement…</p>
                ) : null}
              </div>
            </div>

            <div className="affiliate-agreement__notice">
              <span className="affiliate-agreement__notice-icon" aria-hidden="true">
                <ShieldCheckIcon />
              </span>
              <div>
                <p className="affiliate-agreement__notice-title">Important</p>
                <p>
                  Please review the entire Affiliate Agreement carefully. By signing below, you confirm that you
                  understand and agree to all terms and conditions, including the commission structure, referral
                  terms, confidentiality requirements and your obligations as an affiliate partner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 07 · Final CTA + application form ---------- */}
      <Section id="apply" tone="ink" size="lg">
        <div className="container container--wide">
          <p className="affiliate-close-statement" data-reveal>
            Turn your network into opportunity.
          </p>

          <div className="affiliate__apply" data-reveal>
            <div>
              <h2>Apply to become an AIIT Affiliate</h2>
              <p>
                Every application is screened by the AIIT team before it&apos;s approved. Once it is, you get a
                personal referral link, not a code to hand out.
              </p>
            </div>

            {isLoggedIn && affiliateMe.status === 'loading' ? <p className="affiliate__thanks">Checking your account…</p> : null}

            {isLoggedIn && affiliateMe.status === 'ready' && affiliateMe.data.hasApplied ? (
              <div className="affiliate__status-card affiliate__status-card--applied" data-reveal>
                <span className="affiliate__status-icon" aria-hidden="true">
                  <ClipboardIcon />
                </span>
                <h3>You&apos;ve already applied</h3>
                <p>
                  Your application is on file and the AIIT team reviews every one by hand. Track its progress,
                  download your signed agreement, and, once approved, grab your referral link, all from your
                  dashboard.
                </p>
                <Link to="/affiliate-portal" className="affiliate__status-cta">
                  Go to your affiliate dashboard →
                </Link>
              </div>
            ) : done && !isLoggedIn ? (
              <div className="affiliate__status-card affiliate__status-card--pending" data-reveal>
                <span className="affiliate__status-icon" aria-hidden="true">
                  <MailIcon />
                </span>
                <h3>Check your email to sign in</h3>
                <p>
                  Your application is in. We&apos;ve sent your login details to <strong>{email}</strong>: your email
                  address as your username and a one-time password. Sign in with those, and you&apos;ll be asked to
                  set your own password right away.
                </p>
                <p>
                  That email also has a separate reference code &mdash; keep it. You&apos;ll use it on your dashboard
                  to activate your referral link once your application is approved.
                </p>
                <p className="affiliate__status-meta">Didn&apos;t get it? Check spam, or call/WhatsApp {SITE.contact.phone}.</p>
              </div>
            ) : done ? (
              <div className="affiliate__status-card affiliate__status-card--success" data-reveal>
                <span className="affiliate__status-icon" aria-hidden="true">
                  <CheckBadgeIcon />
                </span>
                <h3>Application submitted</h3>
                <p>
                  Thanks, your signed agreement is on file and the AIIT team reviews every application by hand.
                  You&apos;ll see your status update in real time on your dashboard, and we&apos;ll email you the
                  moment a decision is made.
                </p>
                <Link to="/affiliate-portal" className="affiliate__status-cta">
                  Go to your affiliate dashboard →
                </Link>
                <p className="affiliate__status-meta">Questions? Call or WhatsApp {SITE.contact.phone}.</p>
              </div>
            ) : !(isLoggedIn && affiliateMe.status === 'loading') ? (
              <form className="affiliate__form" onSubmit={onSubmit}>
                <Logo variant="dark" className="affiliate__form-logo" />
                {error ? (
                  <p className="auth__alert" role="alert">
                    {error}
                    {error === ALREADY_REGISTERED_MESSAGE ? (
                      <>
                        {' '}
                        <Link to="/login" state={{ from: { pathname: '/affiliate' } }}>
                          Sign in →
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {!isLoggedIn ? (
                  <fieldset className="affiliate__form-section">
                    <legend>Your account</legend>
                    <TextField
                      label="Full name"
                      name="name"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                      label="Email address"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      hint="We'll email your login details here, no password to set, we'll send you a one-time one."
                      className="field--wide"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </fieldset>
                ) : null}

                <fieldset className="affiliate__form-section">
                  <legend>About you</legend>
                  <CheckboxGroupField
                    label="What kind of affiliate are you? (select all that apply)"
                    required
                    className="field--wide"
                    options={AFFILIATE_TYPE_OPTIONS}
                    value={types}
                    onChange={(next) => setTypes(next as AffiliateType[])}
                    hint="You can hold more than one, e.g. refer students directly and also bring in other affiliates."
                  />
                  <TextField
                    label="Have a coupon code from an AIIT affiliate? (optional)"
                    name="affiliateCouponCode"
                    className="field--wide"
                    hint="If another affiliate gave you a code to recruit you into the affiliate program, enter it here."
                    value={affiliateCouponCode}
                    onChange={(e) => setAffiliateCouponCode(e.target.value)}
                  />
                  <PhoneCountrySelect label="Country code" value={phoneCountry} onChange={setPhoneCountry} />
                  <TextField
                    label="Mobile number"
                    name="phone"
                    type="tel"
                    autoComplete="tel-national"
                    hint="Without the leading 0, e.g. 8012345678."
                    value={phoneNational}
                    onChange={(e) => setPhoneNational(e.target.value)}
                  />
                  <TextField
                    label="Platform or profile link (optional)"
                    name="handle"
                    className="field--wide"
                    hint="Instagram, YouTube, TikTok, a website, wherever we can see your work."
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                  <div className="affiliate__social-links field--wide">
                    <p className="field__hint affiliate__social-links-hint">
                      Add your social profiles (optional), but once you add one, its follower count is required.
                      Add up to {MAX_SOCIAL_LINKS}.
                    </p>
                    {socialLinks.map((row, i) => (
                      <div className="affiliate__social-row" key={i}>
                        <SelectField
                          label="Platform"
                          className="affiliate__social-platform"
                          options={SOCIAL_PLATFORM_OPTIONS}
                          value={row.platform}
                          onChange={(e) => updateSocialLink(i, { platform: e.target.value as AffiliateSocialPlatform })}
                        />
                        <TextField
                          label="Profile URL"
                          type="url"
                          className="affiliate__social-url"
                          placeholder={SOCIAL_PLATFORM_PLACEHOLDERS[row.platform]}
                          value={row.url}
                          onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                        />
                        <TextField
                          label="Followers"
                          type="number"
                          min={0}
                          required={row.url.trim().length > 0}
                          className="affiliate__social-followers"
                          value={row.followers}
                          onChange={(e) => updateSocialLink(i, { followers: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="affiliate__social-remove"
                          aria-label={`Remove this ${socialPlatformLabel(row.platform)} profile`}
                          onClick={() => removeSocialLink(i)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {socialLinks.length < MAX_SOCIAL_LINKS && (
                      <Button type="button" variant="ghost" size="sm" onClick={addSocialLink}>
                        Add another platform
                      </Button>
                    )}
                  </div>
                  <SelectField
                    label="Country"
                    name="country"
                    required
                    options={COUNTRY_OPTIONS}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                  <SearchableSelect
                    label="State / Province"
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
                  <SelectField
                    label="How did you hear about us?"
                    name="source"
                    options={[
                      { value: '', label: 'Select one' },
                      { value: 'social', label: 'Social Media' },
                      { value: 'friend', label: 'Through a Friend' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <TextArea
                    label="Tell us about yourself and your audience (optional)"
                    name="motivation"
                    className="field--wide"
                    rows={4}
                    maxLength={1000}
                    hint="Your platform, audience size, or why you'd be a great AIIT affiliate: this is what we actually review you on."
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                  />
                </fieldset>

                <fieldset className="affiliate__form-section">
                  <legend>Sign the agreement</legend>
                  <p className="affiliate__read-notice">
                    Please read the Affiliate Agreement above carefully, in full, before you sign below. It covers
                    how and when you&apos;re paid, confidentiality, and your obligations as a partner, and typing
                    your name is a legally binding signature under Clause 21.
                  </p>
                  <TextField
                    label="Type your full legal name to sign this agreement"
                    name="signedName"
                    required
                    className="field--wide affiliate__signature-field"
                    hint="This is your electronic signature on the Affiliate Agreement above."
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                  />
                  <label className="affiliate__agree">
                    <input
                      type="checkbox"
                      required
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />{' '}
                    I have read and agree to the AIIT Affiliate Agreement above, including the commission structure
                    and referral terms, and I consent to sign it electronically as described in Clause 21.
                  </label>
                  <Button as="button" type="submit" size="lg" fullWidth arrow loading={submitting} disabled={!canSubmit}>
                    {isLoggedIn ? 'Submit application' : 'Create account & apply'}
                  </Button>
                  <p className="affiliate__disclaimer">{a.disclaimer}</p>
                </fieldset>
              </form>
            ) : null}
          </div>
        </div>
      </Section>
    </Layout>
  );
}
