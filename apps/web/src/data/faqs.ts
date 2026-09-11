import type { FaqItem } from './types';

/**
 * FAQ categories exactly as they appear on aiit.network's help centre.
 */
export const FAQ_CATEGORIES = [
  'About AIIT',
  'Courses & Learning',
  'Certification',
  'AIIT Blueprint',
  'Pricing & Enrollment',
  'Support',
] as const;

/**
 * Pulled directly from aiit.network/frequently-asked-questions-faqs/ (29
 * published questions across 6 categories).
 */
export const FAQS: FaqItem[] = [
  {
    id: "faq-what-is-aiit-azraa-institute-of",
    category: "About AIIT",
    question: "What is AIIT (Azraa Institute of Information Technology)?",
    answer: "AIIT is an international online technology learning platform delivering high-quality training in emerging, future-ready digital fields. Our mission is to help students, developers, and professionals build practical, real-world skills in Artificial Intelligence, Data Science, Cloud Computing, Quantum Computing, Edge Computing, and AR/VR technologies.",
  },
  {
    id: "faq-where-is-aiit-based-and-who",
    category: "About AIIT",
    question: "Where is AIIT based, and who can enroll?",
    answer: "AIIT's head office is in Coimbatore, Tamil Nadu, India, with an active expansion focus across Africa. Because AIIT is an online platform, students from anywhere in the world — including Nigeria and other African countries — can enroll and learn remotely.",
  },
  {
    id: "faq-what-subjects-and-technologies-does-aiit",
    category: "About AIIT",
    question: "What subjects and technologies does AIIT teach?",
    answer: "AIIT's specialized programs cover Artificial Intelligence & Machine Learning, Generative AI & LLMs, Data Science & Analytics, Cloud Computing & DevOps, Cybersecurity & Ethical Hacking, Networking & Infrastructure, and Software Development.",
  },
  {
    id: "faq-is-aiit-only-for-tech-professionals",
    category: "About AIIT",
    question: "Is AIIT only for tech professionals, or can beginners join too?",
    answer: "AIIT welcomes complete beginners as well as working developers and professionals looking to upskill. Course tracks range from absolute-beginner digital literacy content up to advanced, industry-aligned technical certifications.",
  },
  {
    id: "faq-does-aiit-offer-anything-beyond-technical",
    category: "About AIIT",
    question: "Does AIIT offer anything beyond technical courses?",
    answer: "Yes. In addition to technology courses, AIIT offers an online leadership development program through Learnum, designed to build professional and leadership skills alongside technical training.",
  },
  {
    id: "faq-how-do-i-access-aiit-courses",
    category: "Courses & Learning",
    question: "How do I access AIIT courses and my learning dashboard?",
    answer: "Once you register on aiit.network, you can access all enrolled courses through your learner dashboard. Simply log in and select \"Learning Now\" or visit the Courses page to browse and start any program.",
  },
  {
    id: "faq-what-are-some-popular-courses-offered",
    category: "Courses & Learning",
    question: "What are some popular courses offered by AIIT?",
    answer: "Popular programs include Cloud Computing Fundamentals, Cisco CCNA (Cisco Certified Network Associate), and Quantum Computing Fundamentals, alongside a growing catalog across AI, cybersecurity, and software development.",
  },
  {
    id: "faq-are-aiit-courses-self-paced-or",
    category: "Courses & Learning",
    question: "Are AIIT courses self-paced or scheduled?",
    answer: "Most AIIT courses are delivered through a flexible online learning platform, allowing you to study at your own pace. Specific scheduling details vary by course — check each course page for exact format and duration.",
  },
  {
    id: "faq-do-i-need-any-prior-experience",
    category: "Courses & Learning",
    question: "Do I need any prior experience to start a course?",
    answer: "It depends on the course. Beginner-friendly tracks (such as Digital & Tech Literacy) require no prior experience, while advanced tracks in networking, cloud, or AI may recommend foundational knowledge. Each course listing outlines any prerequisites.",
  },
  {
    id: "faq-can-i-preview-a-course-before",
    category: "Courses & Learning",
    question: "Can I preview a course before enrolling?",
    answer: "You can browse full course descriptions, outlines, and pricing on the Courses page before enrolling, so you know exactly what each program covers.",
  },
  {
    id: "faq-will-i-receive-a-certificate-after",
    category: "Certification",
    question: "Will I receive a certificate after completing a course?",
    answer: "Yes. AIIT issues online certificates upon successful course completion, which are designed to be used worldwide as proof of your training and skills.",
  },
  {
    id: "faq-are-aiit-certificates-recognized-internationally",
    category: "Certification",
    question: "Are AIIT certificates recognized internationally?",
    answer: "AIIT certificates are built to be used worldwide and can strengthen your professional profile and university applications alike. As with any credential, recognition ultimately depends on the specific employer or institution you present it to.",
  },
  {
    id: "faq-can-i-use-my-aiit-certificate",
    category: "Certification",
    question: "Can I use my AIIT certificate for university applications?",
    answer: "Yes. AIIT certifications and project portfolios can be used to strengthen applications for universities and employers worldwide, particularly for students pursuing further study through the AIIT Blueprint pathway.",
  },
  {
    id: "faq-what-is-the-aiit-blueprint-program",
    category: "AIIT Blueprint",
    question: "What is the AIIT Blueprint program?",
    answer: "AIIT Blueprint is AIIT's gateway to global higher education. It helps students transform their AIIT skills and certifications into academic and professional opportunities abroad — whether pursuing a Bachelor's, Master's, Postgraduate Diploma, Research Program, or Industry Certification.",
  },
  {
    id: "faq-which-countries-can-i-study-in",
    category: "AIIT Blueprint",
    question: "Which countries can I study in through the AIIT Blueprint?",
    answer: "Through AIIT's academic collaborations and international connections, students can explore higher education opportunities in Malaysia, Singapore, the United Arab Emirates (Dubai), Australia, and India.",
  },
  {
    id: "faq-what-kind-of-support-does-aiit",
    category: "AIIT Blueprint",
    question: "What kind of support does AIIT Blueprint provide?",
    answer: "AIIT Blueprint guidance includes career counseling and pathway planning, program and university selection, admission application support, Statement of Purpose (SOP) guidance, portfolio and project preparation, scholarship identification assistance, student visa guidance and documentation support, and pre-departure orientation.",
  },
  {
    id: "faq-can-aiit-guarantee-my-student-visa",
    category: "AIIT Blueprint",
    question: "Can AIIT guarantee my student visa will be approved?",
    answer: "No. Malaysia, UAE (Dubai), Singapore, Australia, and India generally offer student visa routes provided admission, financial, and immigration requirements are met — but visa policies change periodically and approval is always at the discretion of the respective immigration authorities. AIIT provides guidance and documentation support but cannot guarantee visa issuance.",
  },
  {
    id: "faq-why-is-malaysia-a-popular-blueprint",
    category: "AIIT Blueprint",
    question: "Why is Malaysia a popular Blueprint destination?",
    answer: "Malaysia is a preferred destination for international students due to affordable tuition fees, globally recognized universities, a multicultural environment, and comparatively straightforward student visa procedures, with pathway programs into undergraduate and postgraduate study.",
  },
  {
    id: "faq-what-makes-dubai-uae-an-option",
    category: "AIIT Blueprint",
    question: "What makes Dubai (UAE) an option for AIIT students?",
    answer: "Dubai has emerged as a global education hub hosting international branch campuses from the UK, Australia, India, and North America. Student visas are generally sponsored by accredited universities, making the process structured and student-friendly.",
  },
  {
    id: "faq-what-about-studying-in-singapore-or",
    category: "AIIT Blueprint",
    question: "What about studying in Singapore or Australia?",
    answer: "Singapore offers world-class universities, strong industry connections, and excellent employability outcomes, with international full-time students typically obtaining a Student Pass. Australia is a leading destination especially for technology, engineering, data science, and AI, with visa applications assessed under the Genuine Student (GS) framework.",
  },
  {
    id: "faq-do-i-need-an-aiit-course",
    category: "AIIT Blueprint",
    question: "Do I need an AIIT course certificate before applying through Blueprint?",
    answer: "AIIT's specialized programs in AI, Data Science, Cloud Computing, Cybersecurity, Networking, and Software Development are designed to build a strong foundation for higher education. Completing relevant AIIT courses and building a project portfolio strengthens your Blueprint application, though the specific requirement depends on your target university and program.",
  },
  {
    id: "faq-how-much-do-aiit-courses-cost",
    category: "Pricing & Enrollment",
    question: "How much do AIIT courses cost?",
    answer: "Course pricing varies by program — for example, Cloud Computing Fundamentals and Cisco CCNA are listed at $140+, and Quantum Computing Fundamentals at $169+. Visit the Courses page for current pricing on each program.",
  },
  {
    id: "faq-does-aiit-offer-discounts-on-courses",
    category: "Pricing & Enrollment",
    question: "Does AIIT offer discounts on courses?",
    answer: "Yes. AIIT provides online courses with a full discount system, so keep an eye on course pages and promotions for available offers.",
  },
  {
    id: "faq-how-do-i-enroll-in-a",
    category: "Pricing & Enrollment",
    question: "How do I enroll in a course?",
    answer: "Register for a free account on aiit.network, browse the Courses page, and enroll directly in your chosen program. You can sign up using email or your Google account.",
  },
  {
    id: "faq-what-payment-methods-does-aiit-accept",
    category: "Pricing & Enrollment",
    question: "What payment methods does AIIT accept?",
    answer: "Payment options are shown at checkout when you enroll in a paid course. For specific payment method questions, contact the AIIT support team directly.",
  },
  {
    id: "faq-how-can-i-contact-aiit-support",
    category: "Support",
    question: "How can I contact AIIT support?",
    answer: "You can reach AIIT by email at info@aiit.network, by phone at +91 422-497-2640 (India) or through the Contact Us page. Office hours are Monday–Saturday, 8:00–18:00 IST.",
  },
  {
    id: "faq-where-is-the-aiit-office-located",
    category: "Support",
    question: "Where is the AIIT office located?",
    answer: "AIIT's office is located at 36, Farook Nagar 1st Cross, Kovaipudur, Coimbatore 641042, Tamil Nadu, India.",
  },
  {
    id: "faq-does-aiit-have-social-media-channels",
    category: "Support",
    question: "Does AIIT have social media channels I can follow?",
    answer: "Yes — you can follow AIIT on Facebook and YouTube (@AIIT.Network) for course updates, tips, and announcements.",
  },
  {
    id: "faq-i-forgot-my-password-or-i",
    category: "Support",
    question: "I forgot my password or I'm having trouble logging in — what do I do?",
    answer: "Use the \"Restore Password\" option on the Sign In screen to receive a password reset link by email. If you continue to have trouble, contact AIIT support for help.",
  },
];
