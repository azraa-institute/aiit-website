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
    "Refer students to AIIT's globally recognised tech programmes, introduce creators who'll promote us to their audience, or bring other affiliates into the program, and get paid per successful, fully-onboarded enrolment.",
  primaryCta: { label: 'Apply as an Affiliate', to: '#apply' },
  secondaryCta: { label: 'See how you earn', to: '#earn' },
  rates: [
    { label: 'Per student you refer directly', value: '$7' },
    { label: 'Per student via a creator you introduce', value: '$5' },
    { label: 'Once a direct referrer crosses 500 students', value: '$10' },
    { label: 'Per affiliate you successfully refer', value: '$2.50' },
  ],
  // The $10 milestone applies ONLY to direct student referrals -- creator
  // and affiliate-to-affiliate commissions are flat, forever, at every
  // volume. "Fully onboarded"/"successful" both mean the referred person
  // (or, for an affiliate referral, a student the referred affiliate
  // brought in themselves) actually enrolled in and paid for a course --
  // not just registered an account.
  eligibilityNote:
    "Commissions are payable once the referred student has enrolled in a paid course; a free sign-up alone doesn't count. For an affiliate-to-affiliate referral, the affiliate you referred must have themselves onboarded at least one paying student. Only direct student referrals rise to $10 after 500; the creator and affiliate-to-affiliate rates are flat.",
  waysHeading: 'Three ways to earn with AIIT',
  waysIntro:
    "Pick one, two, or all three when you apply. You'll get the right tool for each: a referral link for student referrals, a coupon code for affiliate referrals.",
  ways: [
    {
      kicker: 'Refer students',
      title: 'Bring learners straight to AIIT',
      body: 'Share your referral link with senior secondary students, undergraduates, professionals or graduates looking to upskill. They get 10% off, you earn $7 per student who enrols and pays, rising to $10 once you pass 500.',
      flowSteps: ['You', 'Your referral link', 'Student', 'AIIT'],
      flowReward: '$7 → $10',
    },
    {
      kicker: 'Introduce content creators',
      title: 'Connect us with creators in your network',
      body: 'Know someone with an engaged audience (roughly 50,000+ followers)? Introduce them to AIIT. Every student their link brings in and pays for earns you a flat $5, and AIIT deals with the creator directly on their own terms.',
      flowSteps: ['You', 'Creator', "Creator's audience", 'AIIT'],
      flowReward: '$5',
    },
    {
      kicker: 'Refer other affiliates',
      title: 'Grow the affiliate program itself',
      body: "Give out your coupon code to people who'd make good AIIT affiliates. Once someone you referred is approved and has themselves onboarded a paying student, you earn a flat $2.50, with no volume cap and no escalation.",
      flowSteps: ['You', 'Your coupon code', 'New affiliate', 'Their first paying student'],
      flowReward: '$2.50',
    },
  ],
  steps: [
    { index: '01', title: 'Apply', body: "Fill in the form below with your details and how you'd like to contribute." },
    { index: '02', title: 'Get approved', body: 'Our team reviews your application by hand; once approved, your referral link and/or coupon code are ready in your affiliate dashboard.' },
    { index: '03', title: 'Share your tools', body: 'A referral link for students, a coupon code for affiliates: whichever you applied for, no code to remember or type for student referrals.' },
    { index: '04', title: 'Get paid', body: 'Earnings are calculated on verified, fully-onboarded (paid) enrolments and affiliate referrals, and paid on the agreed schedule.' },
  ],
  disclaimer: "By applying, you're not employed by AIIT, affiliates work as independent referral partners.",
};
