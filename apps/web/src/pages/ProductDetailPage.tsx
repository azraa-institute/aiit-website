import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { getProduct, PRODUCTS } from '@/data/products';
import { formatPrice, discountPercent } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { ProductCard } from '@/components/shop/ProductCard';
import './product-detail.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const product = slug ? getProduct(slug) : undefined;
  const [active, setActive] = useState(0);
  useScrollReveal([slug]);

  if (!product) return <Navigate to="/shop" replace />;

  const off = discountPercent(product.price, product.priceWas);
  const related = PRODUCTS.filter(
    (p) => p.slug !== product.slug && p.category === product.category,
  ).slice(0, 4);
  const fallback =
    related.length < 4
      ? PRODUCTS.filter((p) => p.slug !== product.slug && !related.includes(p)).slice(
          0,
          4 - related.length,
        )
      : [];

  return (
    <Layout>
      <Seo title={product.name} description={product.summary} path={`/shop/${product.slug}`} type="website" />
      <div className="section container container--wide">
        <nav className="product-detail__crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          <span aria-hidden="true">/</span>
          <span>{product.category}</span>
        </nav>

        <div className="product-detail">
          <div className="product-detail__gallery">
            <div className="product-detail__main">
              <img src={product.images[active]} alt={product.name} decoding="async" />
              {off && <span className="product-detail__sale">Sale</span>}
            </div>
            {product.images.length > 1 && (
              <div className="product-detail__thumbs">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    className={i === active ? 'is-active' : ''}
                    onClick={() => setActive(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-detail__info">
            <span className="product-detail__cat">{product.category}</span>
            <h1 className="product-detail__title">{product.name}</h1>
            <div className="product-detail__price">
              {product.priceWas && off ? (
                <>
                  <span className="product-detail__was">{formatPrice(product.priceWas)}</span>
                  <span className="product-detail__now">{formatPrice(product.price)}</span>
                  <span className="product-detail__off">Save {off}%</span>
                </>
              ) : (
                <span className="product-detail__now">{formatPrice(product.price)}</span>
              )}
            </div>
            <p className="product-detail__summary">{product.summary}</p>
            <div className="product-detail__actions">
              <Button
                as="a"
                href={`https://aiit.network/product/${product.slug}/`}
                target="_blank"
                rel="noreferrer"
                size="lg"
                arrow
              >
                Buy in the AIIT store
              </Button>
              <Button as="link" to="/shop" variant="secondary" size="lg">
                Continue browsing
              </Button>
            </div>
            <p className="product-detail__note">
              Ordering and payment are handled on aiit.network.
            </p>
          </div>
        </div>

        <section className="product-detail__related">
          <h2>You may also like</h2>
          <div className="product-detail__related-grid">
            {[...related, ...fallback].map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
