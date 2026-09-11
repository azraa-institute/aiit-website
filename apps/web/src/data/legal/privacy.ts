import type { LegalDoc } from './types';
import { SITE } from '@/data/site';

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy',
  eyebrow: 'Privacy & Data Protection',
  intro:
    'How Azraa Institute of Information Technology collects, uses and protects the personal information of everyone who learns, browses or registers with us.',
  effectiveLabel: 'Effective',
  effectiveDate: '17 June 2026',
  sections: [
    {
      id: 'information-we-collect',
      title: 'Information we collect',
      lead: `At Azraa Institute of Information Technology ("AIIT", "we", "us", or "our"), operating ${SITE.url}, we collect the following categories of information.`,
      groups: [
        {
          label: 'Personal information you provide',
          items: [
            'Full name, email address and phone number',
            'Billing and payment information, processed via third-party payment gateways',
            'Course enrollment details, progress and certificates',
            'Account credentials — username and password',
            'Messages or inquiries submitted through contact forms',
          ],
        },
        {
          label: 'Automatically collected information',
          items: [
            'IP address, browser type and device information',
            'Pages visited, time spent and interaction data',
            'Cookies and similar tracking technologies',
          ],
        },
        {
          label: 'Information from third parties',
          items: [
            'Payment processors, for course purchases',
            'Google Analytics or similar tools, for site improvement',
          ],
        },
      ],
    },
    {
      id: 'how-we-use-it',
      title: 'How we use your information',
      lead: 'The information we collect enables us to:',
      items: [
        'Provide, maintain and improve our online courses and services',
        'Process enrollments and payments',
        'Send updates, receipts and certificates',
        'Communicate about courses, promotions and newsletters — with an opt-out always available',
        'Analyse website usage and enhance the learner experience',
        'Prevent fraud and keep the platform secure',
        'Comply with our legal obligations',
      ],
    },
    {
      id: 'sharing-of-your-information',
      title: 'Sharing of your information',
      lead: 'We do not sell your personal data. Information may be shared only when:',
      items: [
        'We work with service providers who are contractually obligated to protect it — hosting, payments and email delivery',
        'It is required for legal reasons, such as a court order or legal compliance',
        'AIIT is involved in a merger, acquisition or sale of its business',
      ],
      clause: 'AIIT does not sell personal data.',
    },
    {
      id: 'cookies-and-tracking',
      title: 'Cookies and tracking',
      lead: 'Cookies help us run the platform and understand how it is used. You can manage your preferences through your browser settings at any time. We use:',
      items: [
        'Essential cookies — required for core site functionality',
        'Analytics cookies — to understand visitor behaviour and improve the platform',
        'Preference cookies — to remember your settings',
      ],
    },
    {
      id: 'data-security',
      title: 'Data security',
      paragraphs: [
        'We apply reasonable security measures to protect your information. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.',
        'You can help by choosing a strong, unique password and keeping your login details confidential.',
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      lead: 'You have the right to:',
      items: [
        'Access, update or delete your personal information',
        'Opt out of marketing communications at any time',
        'Request data portability, where applicable',
        'Withdraw consent, where our processing is based on consent',
      ],
      paragraphs: [`To exercise any of these rights, contact us at ${SITE.contact.email}.`],
    },
    {
      id: 'childrens-privacy',
      title: "Children's privacy",
      paragraphs: [
        'Our services are not directed to children under 13. We do not knowingly collect personal information from children, and we will delete any such information if we become aware of it.',
      ],
    },
    {
      id: 'international-data-transfers',
      title: 'International data transfers',
      paragraphs: [
        'AIIT serves learners around the world, so your information may be processed in a country other than the one you live in, including India, where AIIT is based. Where this happens, we apply appropriate safeguards to keep your information protected.',
      ],
    },
    {
      id: 'changes-to-this-policy',
      title: 'Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. Significant changes will be posted here with an updated effective date.',
      ],
    },
    {
      id: 'contact-us',
      title: 'Contact us',
      paragraphs: [
        `Questions about this Privacy Policy can be sent to ${SITE.name} at ${SITE.contact.email}, or by post to ${SITE.contact.addressLine}`,
      ],
    },
  ],
  closing: [
    SITE.name,
    `${SITE.contact.email} · ${SITE.url}`,
  ],
};
