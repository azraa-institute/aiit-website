import { useState } from 'react';
import type { FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useInView } from '@/lib/useInView';
import { useAnimatedNumber, useCountUpOnce } from '@/lib/useAnimatedNumber';
import { AFFILIATE } from '@/data/blueprint';
import { SITE } from '@/data/site';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { TextField, SelectField } from '@/components/common/Field';
import { Turnstile } from '@/components/common/Turnstile';
import { apiFetch } from '@/lib/api';
import { AffiliateNetwork } from './AffiliateNetwork';
import { cn } from '@/lib/cn';
import './affiliate-page.css';

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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [source, setSource] = useState('');
  const [intent, setIntent] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

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
      await apiFetch('/affiliate-applications', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          handle: handle || undefined,
          country: country || undefined,
          city: city || undefined,
          referralCode: referralCode || undefined,
          source: source || undefined,
          intent: intent || undefined,
          turnstileToken,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && agreed && turnstileToken.length > 0;

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
            <div className="affiliate-agreement__copy">
              <p className="eyebrow">Affiliate agreement</p>
              <h2 className="affiliate-section-title affiliate-agreement__title">
                Read the Affiliate Agreement first
              </h2>
              <p className="affiliate-section-intro">
                Before you apply, review the full terms — commission structure, eligibility,
                obligations and payment terms.
              </p>
            </div>
            <div className="affiliate-agreement__action">
              <Button
                as="a"
                href="/assets/affiliate/aiit-affiliate-agreement.pdf"
                download="AIIT-Affiliate-Agreement.pdf"
                type="application/pdf"
                variant="secondary"
                size="lg"
                arrow
              >
                Download PDF
              </Button>
              <p className="affiliate-agreement__meta">3 pages · 158 KB</p>
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
              <p>Takes about 2 minutes. We&apos;ll email you once your application is reviewed.</p>
              <p className="affiliate__code">
                Weren&apos;t referred by anyone specific? Use our default code:{' '}
                <strong>{a.defaultCode}</strong>
              </p>
            </div>

            {done ? (
              <p className="affiliate__thanks">
                Thanks, your application is in. We&apos;ll email you at the address you gave once
                it&apos;s reviewed. Questions? Call or WhatsApp {SITE.contact.phone}.
              </p>
            ) : (
              <form className="affiliate__form" onSubmit={onSubmit}>
                {error ? (
                  <p className="auth__alert" role="alert">
                    {error}
                  </p>
                ) : null}
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
                <TextField
                  label="Coupon code of who referred you"
                  name="ref"
                  placeholder={a.defaultCode}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
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
                <SelectField
                  label="What would you like to do?"
                  name="intent"
                  options={[
                    { value: '', label: 'Select one' },
                    { value: 'refer', label: 'Refer Students' },
                    { value: 'creators', label: 'Introduce Content Creators' },
                    { value: 'both', label: 'Both' },
                  ]}
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                />
                <label className="affiliate__agree">
                  <input
                    type="checkbox"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />{' '}
                  I have read and agree to the AIIT Affiliate Agreement, including the commission
                  structure and referral terms.
                </label>
                <Turnstile onVerify={setTurnstileToken} />
                <Button as="button" type="submit" size="lg" fullWidth arrow loading={submitting} disabled={!canSubmit}>
                  Submit application
                </Button>
                <p className="affiliate__disclaimer">{a.disclaimer}</p>
              </form>
            )}
          </div>
        </div>
      </Section>
    </Layout>
  );
}
