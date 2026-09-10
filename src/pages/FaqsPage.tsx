import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { FAQS, FAQ_CATEGORIES } from '@/data/faqs';
import { cn } from '@/lib/cn';
import './faqs-page.css';

export default function FaqsPage() {
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  useScrollReveal([cat, q]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== 'all' && f.category !== cat) return false;
      if (term && !`${f.question} ${f.answer}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [cat, q]);

  return (
    <Layout>
      <Seo
        title="FAQs"
        description="Answers about AIIT courses, certification, the AIIT Blueprint, pricing, enrolment and support."
        path="/faqs"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }}
      />
      <PageBanner
        eyebrow="Help Center"
        title="Frequently Asked Questions"
        intro="Everything you need to know about courses, certification, the AIIT Blueprint pathway, and studying with Azraa Institute of Information Technology."
      />

      <div className="section container container--wide">
        <div className="faqs-page">
          <aside className="faqs-page__side">
            <input
              className="faqs-page__search"
              type="search"
              placeholder="Search questions"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search questions"
            />
            <nav className="faqs-page__cats" aria-label="FAQ categories">
              <button
                className={cn('faqs-page__cat', cat === 'all' && 'is-active')}
                onClick={() => setCat('all')}
              >
                All questions
              </button>
              {FAQ_CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={cn('faqs-page__cat', cat === c && 'is-active')}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </nav>
          </aside>

          <div className="faqs-page__list">
            {list.length === 0 ? (
              <div className="faqs-page__empty">
                <p className="faqs-page__empty-title">No matching questions</p>
                <p>Try a different keyword, or browse a category above.</p>
              </div>
            ) : (
              list.map((f) => {
                const isOpen = openId === f.id;
                return (
                  <div
                    key={f.id}
                    className="faqs-page__item"
                    data-open={isOpen ? '' : undefined}
                    data-reveal
                  >
                    <h3 className="faqs-page__q">
                      <button
                        type="button"
                        id={`${f.id}-btn`}
                        className="faqs-page__summary"
                        aria-expanded={isOpen}
                        aria-controls={`${f.id}-panel`}
                        onClick={() => setOpenId(isOpen ? null : f.id)}
                      >
                        <span>{f.question}</span>
                        <span className="faqs-page__icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                        </span>
                      </button>
                    </h3>
                    <div
                      id={`${f.id}-panel`}
                      role="region"
                      aria-labelledby={`${f.id}-btn`}
                      className="faqs-page__panel"
                    >
                      <div className="faqs-page__panel-inner">
                        <p>{f.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div className="faqs-page__contact on-ink">
              <p>Still have questions?</p>
              <span className="faqs-page__hours">
                Our team in Coimbatore is happy to help, Mon&ndash;Sat, 8:00&ndash;18:00 IST.
              </span>
              <Link to="/contact" className="btn btn--link">
                <span className="btn__label">Contact AIIT Support</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
