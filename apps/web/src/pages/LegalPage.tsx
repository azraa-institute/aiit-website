import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { TermsBook } from '@/components/legal/TermsBook';
import { PRIVACY_POLICY } from '@/data/legal/privacy';
import { TERMS_AND_CONDITIONS } from '@/data/legal/terms';

type LegalKind = 'privacy' | 'terms';

const DOCS = {
  privacy: { doc: PRIVACY_POLICY, path: '/privacy-policy' },
  terms: { doc: TERMS_AND_CONDITIONS, path: '/terms' },
} satisfies Record<LegalKind, { doc: typeof PRIVACY_POLICY; path: string }>;

/**
 * Terms gets the interactive "book" presentation (TermsBook); Privacy
 * Policy keeps the conventional scrolling LegalDocument reading
 * experience -- the redesign is deliberately scoped to /terms only.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { doc, path } = DOCS[kind];
  return (
    <Layout>
      <Seo title={doc.title} description={doc.intro} path={path} />
      {kind === 'terms' ? <TermsBook doc={doc} key={kind} /> : <LegalDocument doc={doc} kind={kind} key={kind} />}
    </Layout>
  );
}
