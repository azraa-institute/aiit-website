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

export function Seo({ title, description, path = '', image, type = 'website', noindex, jsonLd }: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE.shortName}` : SITE.title;
  const desc = description ?? SITE.description;
  const url = `${SITE.url}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

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
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}

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
