import { Helmet } from 'react-helmet-async';
import { SITE } from '@/data/site';

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  /** JSON-LD structured data object(s). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * The homepage's own hero poster -- already the first thing every visitor
 * sees, so it doubles as the site's default social-share card rather than
 * a separate purpose-built OG asset. Every page used to pass no image at
 * all (confirmed: zero callers set the `image` prop), so every shared
 * link -- Facebook, LinkedIn, X, WhatsApp, Slack, iMessage -- showed no
 * preview image whatsoever. A real 1280x720 photo beats nothing even
 * where a page-specific image would be better.
 */
const DEFAULT_OG_IMAGE = '/assets/hero/hero-intro-poster.jpg';

export function Seo({ title, description, path = '', image, type = 'website', noindex, jsonLd }: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE.shortName}` : SITE.title;
  const desc = description ?? SITE.description;
  const url = `${SITE.url}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  // OG/Twitter crawlers don't resolve relative URLs against the page, so
  // this always needs to be absolute -- every image prop passed in this
  // codebase (course.image, a blog post's frontmatter image) is a
  // site-relative path, same convention as DEFAULT_OG_IMAGE above.
  const resolvedImage = image ?? DEFAULT_OG_IMAGE;
  const absoluteImage = resolvedImage.startsWith('http') ? resolvedImage : `${SITE.url}${resolvedImage}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:site_name" content={SITE.shortName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={absoluteImage} />

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

/** Organization JSON-LD, used site-wide. */
export function organizationLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    email: SITE.contact.email,
    telephone: SITE.contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.contact.street,
      addressLocality: SITE.contact.city,
      addressRegion: SITE.contact.region,
      postalCode: SITE.contact.postalCode,
      addressCountry: SITE.contact.country,
    },
    sameAs: SITE.social.map((s) => s.url),
  };
}
