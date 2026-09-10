import { Link } from 'react-router-dom';
import type { Product } from '@/data/types';
import { formatPrice, discountPercent } from '@/lib/format';
import './product-card.css';

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.price, product.priceWas);
  return (
    <article className="product-card" data-reveal>
      <Link to={`/shop/${product.slug}`} className="product-card__media">
        <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" />
        {off && <span className="product-card__sale">Sale</span>}
      </Link>
      <div className="product-card__body">
        <span className="product-card__cat">{product.category}</span>
        <h3 className="product-card__title">
          <Link to={`/shop/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__price">
          {product.priceWas && off ? (
            <>
              <span className="product-card__was">{formatPrice(product.priceWas)}</span>
              <span className="product-card__now">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="product-card__now">{formatPrice(product.price)}</span>
          )}
        </div>
        <Link to={`/shop/${product.slug}`} className="product-card__cta">
          View product
        </Link>
      </div>
    </article>
  );
}
