import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { PRODUCTS, PRODUCT_CATEGORIES } from '@/data/products';
import { ProductCard } from '@/components/shop/ProductCard';
import { cn } from '@/lib/cn';
import './shop-page.css';

const SORTS = [
  { value: 'default', label: 'Sort by popularity' },
  { value: 'latest', label: 'Sort by latest' },
  { value: 'price-low', label: 'Sort by price: low to high' },
  { value: 'price-high', label: 'Sort by price: high to low' },
];

export default function ShopPage() {
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('default');
  useScrollReveal([cat, sort]);

  const items = useMemo(() => {
    let out = PRODUCTS.filter((p) => cat === 'all' || p.category === cat);
    if (sort === 'price-low') out = [...out].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === 'price-high') out = [...out].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return out;
  }, [cat, sort]);

  return (
    <Layout>
      <Seo
        title="Shop"
        description="AIIT branded merchandise and content-creation hardware, mouse pads, caps, hoodies, microphones, lights, gimbals and more."
        path="/shop"
      />
      <PageBanner
        eyebrow="Shop"
        title="AIIT Shop"
        intro="Branded academy merchandise, plus the content-creation and hardware kit learners use most. Ordering and payment are completed on aiit.network."
      />

      <div className="section container container--wide">
        <div className="shop-page__bar">
          <div className="shop-page__cats" role="tablist" aria-label="Product categories">
            <button
              className={cn('chip', cat === 'all' && 'chip--active')}
              onClick={() => setCat('all')}
            >
              All
            </button>
            {PRODUCT_CATEGORIES.map((c) => (
              <button
                key={c}
                className={cn('chip', cat === c && 'chip--active')}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            className="shop-page__sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="shop-page__grid">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
