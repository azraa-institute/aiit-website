import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { LegalBook } from './LegalBook';
import { PRIVACY_POLICY } from '@/data/legal/privacy';
import { TERMS_AND_CONDITIONS } from '@/data/legal/terms';
import { PRIVACY_BOOK_PAGES } from '@/data/legal/privacyBookPages';
import { TERMS_BOOK_PAGES } from '@/data/legal/termsBookPages';

type LegalKind = 'privacy' | 'terms';

const DOCS = {
  privacy: { doc: PRIVACY_POLICY, path: '/privacy-policy', pages: PRIVACY_BOOK_PAGES },
  terms: { doc: TERMS_AND_CONDITIONS, path: '/terms', pages: TERMS_BOOK_PAGES },
} satisfies Record<LegalKind, { doc: typeof PRIVACY_POLICY; path: string; pages: typeof TERMS_BOOK_PAGES }>;

/**
 * Both legal documents get the same interactive "book" presentation
 * (LegalBook) -- each with its own pagination (termsBookPages.ts /
 * privacyBookPages.ts), since the two documents' sections carry very
 * different amounts of content.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { doc, path, pages } = DOCS[kind];
  return (
    <Layout>
      <Seo title={doc.title} description={doc.intro} path={path} />
      <LegalBook doc={doc} pages={pages} key={kind} />
    </Layout>
  );
}
