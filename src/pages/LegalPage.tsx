import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { SITE } from '@/data/site';

type LegalKind = 'privacy' | 'terms' | 'affiliate';

const CONTENT: Record<LegalKind, { title: string; intro: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'How AIIT collects, uses and protects your personal information.',
    sections: [
      { h: 'What we collect', p: 'Account details you provide (name, email, region), course activity and progress, webinar registrations, and standard technical data such as device and browser information.' },
      { h: 'How we use it', p: 'To deliver your courses, issue certificates, communicate about your learning and events, process payments, and improve the platform. We do not sell your personal data.' },
      { h: 'Sharing', p: 'With service providers who help us run the platform (hosting, payments, email), and where required by law. External exam bodies receive only what is needed to register you, and only with your consent.' },
      { h: 'Your rights', p: `You can request access to, correction of, or deletion of your data at any time by emailing ${SITE.contact.email}.` },
      { h: 'Retention', p: 'We keep learner records for as long as your account is active and as required to maintain the integrity of issued credentials.' },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'The terms under which AIIT provides courses and access to the platform.',
    sections: [
      { h: 'Enrolment', p: 'When you enrol you receive a licence to access the course content for your personal, non-commercial learning. Course content remains the property of AIIT and its instructors.' },
      { h: 'Payment', p: 'Prices are shown per course at checkout. Some courses are available only on subscription or to members. Applicable taxes and third-party fees are shown before you pay.' },
      { h: 'Refunds', p: `If a course is not right for you, contact ${SITE.contact.email} within the period stated at checkout for a refund, subject to the conditions set out there.` },
      { h: 'Certificates', p: 'AIIT certificates confirm completion of an AIIT course. Preparation courses for external certifications (such as Cisco CCNA) do not include the external exam, which is sat separately with the awarding body.' },
      { h: 'Acceptable use', p: 'You agree not to share your account, redistribute course materials, or use the platform unlawfully. We may suspend accounts that breach these terms.' },
    ],
  },
  affiliate: {
    title: 'Affiliate Programme',
    intro: 'Partner with AIIT to bring future-ready technology education to your community.',
    sections: [
      { h: 'How it works', p: 'Share your unique link. When someone enrols through it, you earn a commission on their course fee.' },
      { h: 'Who it is for', p: 'Educators, community leaders, content creators and student organisations across Africa and Asia.' },
      { h: 'Getting paid', p: 'Commissions are tracked in your dashboard and paid monthly once you pass the minimum threshold.' },
      { h: 'Apply', p: `Email ${SITE.contact.email} with a short note about your audience and we will send you the full terms and your links.` },
    ],
  },
};

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const c = CONTENT[kind];
  return (
    <Layout>
      <Seo title={c.title} description={c.intro} path={`/${kind === 'terms' ? 'terms' : kind === 'privacy' ? 'privacy-policy' : 'affiliate'}`} />
      <PageBanner eyebrow="AIIT" title={c.title} intro={c.intro} />
      <div className="section container container--text prose">
        {c.sections.map((s) => (
          <div key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </div>
        ))}
        <p style={{ color: 'var(--fg-faint)', fontSize: 'var(--fs-sm)' }}>
          This is a summary for the AIIT platform preview. Last updated {new Date().getFullYear()}.
        </p>
      </div>
    </Layout>
  );
}
