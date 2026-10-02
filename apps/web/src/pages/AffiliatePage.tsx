import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { AffiliateAgreement, AffiliateType } from '@aiit/shared';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useInView } from '@/lib/useInView';
import { useAnimatedNumber, useCountUpOnce } from '@/lib/useAnimatedNumber';
import { AFFILIATE } from '@/data/blueprint';
import { SITE } from '@/data/site';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { TextField, PasswordField, SelectField } from '@/components/common/Field';
import { PASSWORD_HINT, passwordMeetsRequirements } from '@/components/common/PasswordRequirements';
import { apiFetch } from '@/lib/api';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabaseClient';
import { getPendingReferralSlug, clearPendingReferralSlug } from '@/lib/referralAttribution';
import { useAffiliateMe } from './affiliate/affiliateData';
import { AffiliateNetwork } from './AffiliateNetwork';
import { cn } from '@/lib/cn';
import './affiliate-page.css';

const ALREADY_REGISTERED_MESSAGE = 'An account with this email already exists. Please sign in, then apply from this page.';

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
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('');
  const [type, setType] = useState<AffiliateType | ''>('');
  // Deliberately its own field, not pre-filled from `name` -- typing it is
  // the actual signing gesture (see onSubmit), the same convention real
  // e-signature platforms use even when a name is already on file.
  const [signedName, setSignedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  // True once signUp() has sent a confirmation email (not-logged-in path
  // only) -- the application itself still needs a session to submit, which
  // this app only ever grants after that email is confirmed (see
  // RegisterPage.tsx's identical signUp() flow). The visitor finishes
  // applying by coming back to this page once logged in.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      if (!isLoggedIn) {
        if (!supabase) throw new Error('Sign-up is not configured yet.');
        const referralSlug = getPendingReferralSlug();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: name, ...(referralSlug ? { referral_slug: referralSlug } : {}) },
          },
        });
        if (signUpError) {
          throw new Error(signUpError.message.toLowerCase().includes('already registered') ? ALREADY_REGISTERED_MESSAGE : signUpError.message);
        }
        // Same anti-enumeration check RegisterPage.tsx uses: a confirmed
        // existing account comes back as a fake user with no identities,
        // not a clear error.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error(ALREADY_REGISTERED_MESSAGE);
        }
        clearPendingReferralSlug();
        setAwaitingConfirmation(true);
        return;
      }

      await apiFetch('/affiliates/apply', {
        method: 'POST',
        body: JSON.stringify({
          type,
          signedName: signedName.trim(),
          agreedToTerms: agreed,
          phone: phone || undefined,
          handle: handle || undefined,
          country: country || undefined,
          city: city || undefined,
          source: source || undefined,
        }),
      });
      affiliateMe.refetch();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    type.length > 0 &&
    signedName.trim().length > 1 &&
    agreed &&
    (isLoggedIn || (name.trim().length > 0 && email.trim().length > 0 && passwordMeetsRequirements(password)));

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
              kicker="500+ referrals"
              label="Once you cross 500 referrals"
              active={ratesActive}
              delay={300}
            />
          </div>
        </div>
      </Section>

      {/* ---------- 03 · Two ways to earn ---------- */}
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
                {i === 0 ? (
                  <PathwayFlow steps={['You', 'Your code', 'Student', 'AIIT']} reward="$7 → $10" />
                ) : (
                  <PathwayFlow steps={['You', 'Creator', "Creator's audience", 'AIIT']} reward="$5" />
                )}
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
            <p className="eyebrow">Affiliate agreement</p>
            <h2 className="affiliate-section-title affiliate-agreement__title">Read the Affiliate Agreement</h2>
            <p className="affiliate-section-intro">
              This is what you&apos;re agreeing to below -- commission structure, eligibility, obligations,
              payment terms, and the rest. You&apos;ll sign it electronically as part of applying, and can download
              your own signed copy afterwards from your affiliate dashboard.
            </p>
            {agreementError ? <p className="affiliate-agreement__error">{agreementError}</p> : null}
            <div className="affiliate-agreement__text" tabIndex={0} aria-label="Affiliate Agreement, full text">
              {agreement ? (
                agreement.sections.map((section) => (
                  <div key={section.heading} className="affiliate-agreement__clause">
                    <h3>{section.heading}</h3>
                    {section.paragraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                ))
              ) : !agreementError ? (
                <p className="affiliate-agreement__loading">Loading the agreement…</p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 07 · Final CTA + application form ---------- */}
      <Section id="apply" tone="ink" size="lg">
        <div className="container container--wide">
          <p className="affiliate-close-statement" data-reveal>
            Turn your network
            <br />
            into opportunity.
          </p>

          <div className="affiliate__apply" data-reveal>
            <div>
              <h2>Apply to become an AIIT Affiliate</h2>
              <p>
                Every application is screened by the AIIT team before it&apos;s approved -- once it is, you get a
                personal referral link, not a code to hand out.
              </p>
            </div>

            {isLoggedIn && affiliateMe.status === 'loading' ? <p className="affiliate__thanks">Checking your account…</p> : null}

            {isLoggedIn && affiliateMe.status === 'ready' && affiliateMe.data.hasApplied ? (
              <p className="affiliate__thanks">
                You&apos;ve already applied to the affiliate program.{' '}
                <Link to="/affiliate-portal">Check your application status</Link>.
              </p>
            ) : awaitingConfirmation ? (
              <p className="affiliate__thanks">
                We&apos;ve sent a confirmation link to {email}. Once you confirm your account, come back to this page
                signed in to finish applying.
              </p>
            ) : done ? (
              <p className="affiliate__thanks">
                Thanks, your application is in. The AIIT team reviews every application by hand --{' '}
                <Link to="/affiliate-portal">check your status any time</Link>, or we&apos;ll email you the moment a
                decision is made. Questions? Call or WhatsApp {SITE.contact.phone}.
              </p>
            ) : !(isLoggedIn && affiliateMe.status === 'loading') ? (
              <form className="affiliate__form" onSubmit={onSubmit}>
                {error ? (
                  <p className="auth__alert" role="alert">
                    {error}
                  </p>
                ) : null}
                {!isLoggedIn ? (
                  <>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <PasswordField
                      label="Password"
                      name="password"
                      required
                      autoComplete="new-password"
                      hint={PASSWORD_HINT}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </>
                ) : null}
                <SelectField
                  label="What kind of affiliate are you?"
                  name="type"
                  required
                  options={[
                    { value: '', label: 'Select one' },
                    { value: 'creator', label: 'Creator -- I introduce content creators to AIIT' },
                    { value: 'student', label: 'Student referrer -- I refer students directly' },
                    { value: 'affiliate_to_affiliate', label: 'Affiliate-to-affiliate -- I bring in other affiliates' },
                  ]}
                  value={type}
                  onChange={(e) => setType(e.target.value as AffiliateType | '')}
                />
                <TextField
                  label="Phone number"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <TextField
                  label="Social media handle (optional)"
                  name="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
                <TextField label="Country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                <TextField label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
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
                <TextField
                  label="Type your full legal name to sign this agreement"
                  name="signedName"
                  required
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
              </form>
            ) : null}
          </div>
        </div>
      </Section>
    </Layout>
  );
}
