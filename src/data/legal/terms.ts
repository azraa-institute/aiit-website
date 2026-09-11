import type { LegalDoc } from './types';
import { SITE } from '@/data/site';

export const TERMS_AND_CONDITIONS: LegalDoc = {
  title: 'Terms & Conditions',
  eyebrow: 'Terms of Use',
  intro:
    'The terms under which Azraa Institute of Information Technology provides its courses, membership and platform to learners everywhere.',
  effectiveLabel: 'Last updated',
  effectiveDate: '2 June 2026',
  sections: [
    {
      id: 'about-aiit',
      title: 'About AIIT',
      paragraphs: [
        'AIIT is a technology education and innovation institute committed to providing quality education, professional development, research, digital innovation and higher-education pathways.',
        'We offer training in Artificial Intelligence, Machine Learning, Generative AI, Data Science, Cybersecurity, Cloud Computing, Networking, Software Development, digital skills and professional certifications.',
      ],
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      paragraphs: [
        'You must be at least 16 years old, or have parental consent, to register with AIIT. Registration requires accurate information and the legal capacity to enter into agreements, while complying with the laws that apply to you.',
      ],
    },
    {
      id: 'account-registration',
      title: 'Account registration',
      paragraphs: [
        'You must provide accurate details when registering, keep your password confidential, report any unauthorised access promptly, and accept responsibility for activity on your account.',
      ],
      clause: 'AIIT reserves the right to suspend or terminate accounts that contain false information.',
    },
    {
      id: 'course-enrollment',
      title: 'Course enrollment',
      paragraphs: [
        'Enrollment requires successful registration, payment of the applicable fee, and meeting any stated prerequisites. Spaces may be limited.',
      ],
      clause: 'Enrollment is not transferable without written approval from AIIT.',
    },
    {
      id: 'payments',
      title: 'Payments',
      paragraphs: [
        'Fees are quoted in the stated currency and processed by trusted third-party payment providers. Non-payment may result in your course access being suspended.',
      ],
      clause: 'Payments must be made using approved payment methods.',
    },
    {
      id: 'refund-policy',
      title: 'Refund policy',
      paragraphs: [
        'Digital products that have already been accessed are generally non-refundable. Refund requests must be submitted in writing and may be subject to an administrative fee. Scholarships and promotional offers cannot be redeemed for cash.',
      ],
      clause: 'AIIT reserves the right to approve or decline refund requests based on the circumstances.',
    },
    {
      id: 'membership',
      title: 'Membership',
      paragraphs: [
        'Members get access to premium courses, exclusive resources, community participation, events, discounts and career support.',
      ],
      clause: 'Membership benefits may change periodically, and AIIT reserves the right to update its membership offerings.',
    },
    {
      id: 'certification',
      title: 'Certification',
      paragraphs: [
        'Certificates are awarded only after you successfully complete the applicable requirements. Holding an AIIT certificate does not guarantee employment, professional licensing, university admission or immigration approval.',
      ],
      clause: 'AIIT reserves the right to revoke certificates obtained through fraud or academic misconduct.',
    },
    {
      id: 'academic-integrity',
      title: 'Academic integrity',
      lead: 'The following are prohibited:',
      items: [
        'Plagiarism and cheating',
        'Impersonation',
        'Unauthorised collaboration',
        'Submitting AI-generated work where this is prohibited for the assessment',
        'Examination misconduct',
      ],
      paragraphs: [
        'Violations may result in course removal, certificate cancellation, or permanent account suspension.',
      ],
    },
    {
      id: 'student-conduct',
      title: 'Student conduct',
      lead: 'You agree not to:',
      items: [
        'Harass other users',
        'Upload malicious software',
        'Attempt unauthorised access to the platform',
        'Distribute illegal material',
        'Violate intellectual property rights',
        'Interfere with the operation of the platform',
      ],
      paragraphs: ['Abusive behaviour may result in your account being suspended.'],
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual property',
      paragraphs: [
        'Material cannot be copied, reproduced, redistributed, sold or modified without our written permission.',
      ],
      clause:
        'All content — including courses, videos, documents, graphics, logos, learning materials, assessments, software and website content — belongs to AIIT or its licensors.',
    },
    {
      id: 'user-content',
      title: 'User content',
      paragraphs: [
        'You retain ownership of the assignments, projects, portfolios and forum posts you submit.',
      ],
      clause:
        'You grant AIIT a non-exclusive licence to use submitted work for educational, assessment, accreditation, promotional or research purposes.',
    },
    {
      id: 'ai-generated-content',
      title: 'AI-generated content',
      paragraphs: [
        'Some courses may include AI tools. You must review any AI-generated output before relying on it.',
      ],
      clause: 'AIIT is not responsible for inaccuracies generated by third-party AI systems.',
    },
    {
      id: 'career-and-employment',
      title: 'Career and employment',
      paragraphs: [
        'AIIT provides career guidance, internship information, employer connections and recruitment opportunities, but employment decisions rest with employers.',
      ],
      clause: 'AIIT does not guarantee employment, salaries, promotions or job placement.',
    },
    {
      id: 'international-higher-education-pathways',
      title: 'International higher-education pathways',
      paragraphs: [
        'Our support includes counselling, university selection, admission guidance, statement-of-purpose preparation, portfolio development, scholarship identification, visa guidance and orientation.',
      ],
      clause: 'AIIT does not guarantee university admission, scholarships, visa approval, immigration approval or permanent residency.',
    },
    {
      id: 'third-party-services',
      title: 'Third-party services',
      paragraphs: [
        'Our platform integrates services such as Google Sign-In, payment gateways, learning platforms, cloud services and video-conferencing tools.',
      ],
      clause: 'AIIT is not responsible for third-party policies, availability or services.',
    },
    {
      id: 'privacy',
      title: 'Privacy',
      paragraphs: [
        'Our services are also governed by our Privacy Policy. By using AIIT, you consent to the collection and processing of your personal information as described there.',
      ],
    },
    {
      id: 'website-availability',
      title: 'Website availability',
      paragraphs: [
        'While we strive for continuous availability, AIIT does not guarantee uninterrupted access. Services may be suspended temporarily for maintenance, security updates, upgrades or emergencies.',
      ],
    },
    {
      id: 'limitation-of-liability',
      title: 'Limitation of liability',
      paragraphs: ['Our total liability will not exceed the amount you paid for the affected service.'],
      clause:
        'AIIT shall not be liable for indirect damages, lost profits, business interruption, data loss, technical failures, or delays caused by third parties.',
    },
    {
      id: 'indemnification',
      title: 'Indemnification',
      paragraphs: [
        'You agree to indemnify AIIT against claims arising from misuse of our services, a breach of these Terms, a violation of law, or infringement of a third party’s rights.',
      ],
    },
    {
      id: 'termination',
      title: 'Termination',
      paragraphs: [
        'AIIT may suspend or terminate an account for a breach of these Terms, fraud, material misuse, illegal activity or a security threat. Termination does not relieve you of any payment obligations already owed.',
      ],
    },
    {
      id: 'changes-to-services',
      title: 'Changes to our services',
      paragraphs: [
        'AIIT may modify its courses, memberships, fees, features, technologies and policies. Changes take effect on publication unless otherwise stated.',
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing law',
      paragraphs: [
        'These Terms follow the laws applicable in the jurisdiction where you reside, without regard to conflict-of-law principles. Disputes are handled first through good-faith negotiation, then, if unresolved, through the competent local courts.',
      ],
    },
    {
      id: 'force-majeure',
      title: 'Force majeure',
      paragraphs: [
        'AIIT is not liable for delays arising from events beyond our reasonable control, including natural disasters, service outages, government actions, pandemics, civil unrest or other unforeseen events.',
      ],
    },
    {
      id: 'contact-information',
      title: 'Contact information',
      paragraphs: [
        `Questions about these Terms can be sent to ${SITE.name} at ${SITE.contact.email}, or by post to ${SITE.contact.addressLine}`,
      ],
    },
  ],
  closing: [
    'By accessing, registering with, purchasing from, or otherwise using the AIIT website or services, you acknowledge that you have read, understood and agree to these Terms.',
    `${SITE.name} · ${SITE.contact.email} · ${SITE.url}`,
  ],
};
