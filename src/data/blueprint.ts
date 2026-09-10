/**
 * AIIT Blueprint — content from aiit.network/aiit-blueprint. "Your Gateway to
 * Global Higher Education."
 */
export const BLUEPRINT = {
  kicker: 'AIIT Blueprint',
  title: 'Your Gateway to Global Higher Education',
  intro:
    "At AIIT, learning doesn't stop with certification. We help you turn your skills into academic and professional opportunities across the world.",
  intro2:
    "Whether you're aiming for a Bachelor's, Master's, Postgraduate Diploma, Research Program, or Industry Certification, AIIT provides the guidance and pathway to get you there.",
  primaryCta: { label: 'Talk to a Blueprint Advisor', to: '/contact' },
  secondaryCta: { label: 'Browse AIIT Courses', to: '/courses' },
  stats: [
    { value: '5', label: 'Countries' },
    { value: '7', label: 'Program tracks' },
  ],
  destinationsHeading: 'Explore higher education opportunities in',
  /* images: free-licensed (CC BY / CC BY-SA) photos from Wikimedia Commons,
     sourced full-resolution (3840px+ / "4K"+) and compressed locally — see
     scripts/blueprint-dest-webp.mjs for the originals and credits. */
  destinations: [
    { flag: '🇲🇾', name: 'Malaysia', image: '/assets/blueprint/malaysia.webp' },
    { flag: '🇸🇬', name: 'Singapore', image: '/assets/blueprint/singapore.webp' },
    { flag: '🇦🇪', name: 'UAE, Dubai', image: '/assets/blueprint/uae.webp' },
    { flag: '🇦🇺', name: 'Australia', image: '/assets/blueprint/australia.webp' },
    { flag: '🇮🇳', name: 'India', image: '/assets/blueprint/india.webp' },
  ],
  slogan: 'Learn. Certify. Progress. Globalize.',
  sloganSub: 'AIIT, Learn Today. Study Globally. Lead Tomorrow.',
  blocks: [
    {
      kicker: 'Your foundation',
      title: 'Specialized programs built for global pathways',
      body: 'A strong foundation for higher education and international careers, use your AIIT certifications and project portfolio to strengthen applications for universities and employers worldwide.',
    },
    {
      kicker: 'International study pathways',
      title: 'Five destinations. One pathway from AIIT.',
      body: 'Through our academic collaborations, industry networks, and international connections, our team helps you identify the right university, program, and admission route.',
    },
    {
      kicker: 'Special support for students',
      title: 'We guide every step of the journey',
      body: 'AIIT recognizes the aspirations of students seeking international education opportunities. Our guidance includes pathway planning, university selection, SOPs, portfolios, scholarships, and visa guidance.',
    },
  ],
  visaNote: {
    title: 'Important Note Regarding Visas',
    body: 'For Nigerian students, Malaysia, UAE (Dubai), Singapore, Australia, and India generally offer student visa routes, provided admission, financial, and immigration requirements are met. However, visa policies change periodically and approval is always at the discretion of the respective immigration authorities. AIIT provides guidance but cannot guarantee visa issuance.',
  },
  closing: {
    title: 'Ready to build your global career?',
    body: 'Talk to our Blueprint team about pathway planning, university selection, SOPs, portfolios, scholarships, and visa guidance, all in one place.',
    cta: { label: 'Start Your Blueprint Journey', to: '/contact' },
    tagline: 'LEARN TODAY · STUDY GLOBALLY · LEAD TOMORROW',
  },
};

/**
 * AIIT Affiliate Program — content from aiit.network/affiliate.
 */
export const AFFILIATE = {
  kicker: 'AIIT Affiliate Program',
  title: 'Earn every time someone starts their tech career through you.',
  intro:
    "Refer students to AIIT's globally recognised tech programmes, or introduce creators who'll promote us to their audience, and get paid per successful enrolment.",
  primaryCta: { label: 'Apply as an Affiliate', to: '#apply' },
  secondaryCta: { label: 'See how you earn', to: '#earn' },
  rates: [
    { label: 'Per student you refer directly', value: '$7' },
    { label: 'Per student via a creator you introduce', value: '$5' },
    { label: 'Once you cross 500 referrals', value: '$10' },
  ],
  waysHeading: 'Two ways to earn with AIIT',
  waysIntro:
    "Pick one, or do both. You'll get a unique referral code either way, and every student who uses it saves 10% on their course.",
  ways: [
    {
      kicker: 'Refer students',
      title: 'Bring learners straight to AIIT',
      body: 'Share your code with senior secondary students, undergraduates, professionals or graduates looking to upskill. They get 10% off, you earn $7 per verified enrolment, rising to $10 once you pass 500 referrals.',
    },
    {
      kicker: 'Introduce content creators',
      title: 'Connect us with creators in your network',
      body: 'Know someone with an engaged audience (roughly 50,000+ followers)? Introduce them to AIIT. Every student their code brings in earns you $5, and AIIT deals with the creator directly on their own terms.',
    },
  ],
  steps: [
    { index: '01', title: 'Apply', body: "Fill in the form below with your details and how you'd like to contribute." },
    { index: '02', title: 'Get approved', body: 'Our team reviews your application and sends your affiliate agreement and referral code.' },
    { index: '03', title: 'Share your code', body: 'Promote AIIT to students or introduce us to a creator in your network.' },
    { index: '04', title: 'Get paid', body: 'Earnings are calculated on verified enrolments and paid on the agreed schedule.' },
  ],
  defaultCode: 'AIIT-PROMO1',
  disclaimer: "By applying, you're not employed by AIIT, affiliates work as independent referral partners.",
};
