import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CartPriceResponse } from '@aiit/shared';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo, organizationLd } from '@/lib/Seo';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { openRazorpayBundleCheckout } from '@/lib/razorpayCheckout';
import { useCourseDetail } from './CoursesPage.data';
import { invalidateLearner } from './portal/learnerData';
import './mba-program.css';

const MBA_COURSE_SLUGS = [
  'applied-ai-for-markets-and-finance',
  'zoho-crm-professional-certification',
  'strategic-lead-generation-and-growth-marketing',
] as const;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatRupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: CartPriceResponse }
  | { status: 'error'; message: string };

export default function MbaProgramPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  // Fixed, known slugs -- three separate hook calls, not a loop, since
  // hooks can't be called conditionally/dynamically.
  const courseStates = [
    useCourseDetail(MBA_COURSE_SLUGS[0]),
    useCourseDetail(MBA_COURSE_SLUGS[1]),
    useCourseDetail(MBA_COURSE_SLUGS[2]),
  ];

  const [selected, setSelected] = useState<string[]>([...MBA_COURSE_SLUGS]);
  const [promoCode, setPromoCode] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>();
  const debouncedCode = useDebouncedValue(promoCode.trim(), 400);
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });

  useEffect(() => {
    if (!debouncedCode || selected.length === 0) {
      setPreview({ status: 'idle' });
      return;
    }
    let alive = true;
    setPreview({ status: 'loading' });
    apiFetch<CartPriceResponse>('/payment-promos/preview', {
      method: 'POST',
      body: JSON.stringify({ courseSlugs: selected, promoCode: debouncedCode }),
    })
      .then((data) => {
        if (alive) setPreview({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setPreview({ status: 'error', message: err instanceof ApiError ? err.message : 'Could not check that code.' });
      });
    return () => {
      alive = false;
    };
  }, [debouncedCode, selected]);

  function toggleCourse(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handlePay() {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
    if (!keyId || preview.status !== 'ready') return;
    setPayError(undefined);
    setPaying(true);
    openRazorpayBundleCheckout({
      courseSlugs: selected,
      promoCode: debouncedCode,
      keyId,
      onSuccess: () => {
        invalidateLearner();
        navigate('/portal/courses');
      },
      onError: (message) => {
        setPayError(message);
        setPaying(false);
      },
      onDismiss: () => setPaying(false),
    });
  }

  const ready = courseStates.every((c) => c.status === 'ready');
  const hasRazorpay = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  return (
    <Layout>
      <Seo
        title="AIIT Bangalore MBA Certification Program"
        description="Three modular, one-month, tool-based certification courses for first-year MBA students: Applied AI for Markets & Finance, CRM Professional Certification, and Strategic Lead Generation & Growth Marketing."
        path="/mba-certification-program"
        jsonLd={organizationLd()}
      />
      <PageBanner
        eyebrow="AIIT Bangalore"
        title="MBA Certification Program"
        intro="Three modular, one-month, tool-based certification courses for first-year MBA students, delivered live by AIIT instructors online."
        titleWidth="wide"
      />

      <section className="mba-program container container--wide">
        {!ready ? (
          <p className="mba-program__loading">Loading…</p>
        ) : (
          <>
            <div className="mba-program__grid">
              {courseStates.map((c, i) => {
                if (c.status !== 'ready') return null;
                const slug = MBA_COURSE_SLUGS[i];
                const checked = selected.includes(slug);
                return (
                  <div key={slug} className={cn('mba-program__card', checked && 'is-selected')}>
                    <label className="mba-program__card-toggle">
                      <input type="checkbox" checked={checked} onChange={() => toggleCourse(slug)} />
                      <span className="mba-program__card-title">{c.course.title}</span>
                    </label>
                    <p className="mba-program__card-summary">{c.course.summary}</p>
                    <p className="mba-program__card-price">
                      {formatPrice(c.course.price, c.course.currency)}
                    </p>
                    <Link to={`/courses/${slug}`} className="mba-program__card-link">
                      Buy this course on its own
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mba-program__checkout">
              <label className="mba-program__promo-field">
                <span>Have a promo code?</span>
                <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Enter your code" maxLength={40} />
              </label>

              {preview.status === 'loading' ? <p className="mba-program__note">Checking your code…</p> : null}
              {preview.status === 'error' ? (
                <p className="mba-program__note mba-program__note--error">{preview.message}</p>
              ) : null}
              {preview.status === 'ready' ? (
                <p className="mba-program__total">
                  {selected.length} course{selected.length === 1 ? '' : 's'} ·{' '}
                  {formatRupees(preview.data.lines[0]?.amountCents ?? 0)} each · Total {formatRupees(preview.data.totalAmountCents)}
                </p>
              ) : null}
              {payError ? <p className="mba-program__note mba-program__note--error">{payError}</p> : null}

              {status === 'anonymous' ? (
                <Button as="link" to="/register" size="lg" arrow>
                  Sign in to redeem this code
                </Button>
              ) : (
                <Button
                  as="button"
                  type="button"
                  size="lg"
                  arrow
                  loading={paying}
                  disabled={preview.status !== 'ready' || selected.length === 0 || !hasRazorpay}
                  onClick={handlePay}
                >
                  Pay with Razorpay
                </Button>
              )}
              {!hasRazorpay ? <p className="mba-program__note">Online payment isn&apos;t available yet. Use &quot;Ask Quill&quot; for help.</p> : null}
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
