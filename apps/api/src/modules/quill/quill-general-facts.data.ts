/**
 * A small, hand-picked set of general "about AIIT" facts for Quill's
 * general-assistant mode (no course in context -- see
 * QuillService.respondGeneral) -- NOT a sync of apps/web's real FAQ page
 * (apps/web/src/data/faqs.ts, 29 published questions). Copied by hand from
 * the handful of those FAQs Quill fields most when it isn't anchored to a
 * specific course (what AIIT is, who it's for, where it's based). Add an
 * entry here when a new general question comes up often; nothing breaks if
 * this list drifts from the real FAQ page, it just means Quill won't know
 * about it yet.
 */
export interface QuillFact {
  /** Matched against the visitor's message the same way INTENT_PATTERNS is -- see classifyGeneral in quill.service.ts. */
  pattern: RegExp;
  reply: string;
}

export const QUILL_GENERAL_FACTS: QuillFact[] = [
  {
    pattern: /\b(what is aiit|about aiit|who are you|what('|’)?s this|azraa institute)\b/i,
    reply:
      "AIIT (Azraa Institute of Information Technology) is an international online learning platform teaching practical, real-world skills in AI, Data Science, Cloud Computing, Cybersecurity, Quantum Computing, and more.",
  },
  {
    pattern: /\b(where.*(based|located)|head ?office|based in)\b/i,
    reply:
      "AIIT's head office is in Coimbatore, Tamil Nadu, India, with an active expansion focus across Africa, but since everything's online, you can enroll and learn from anywhere.",
  },
  {
    pattern: /\b(beginner|new to tech|no experience|never coded|is this for me)\b/i,
    reply:
      "AIIT welcomes complete beginners as well as working professionals looking to upskill: course tracks range from absolute-beginner digital literacy up to advanced, industry-aligned certifications.",
  },
  {
    pattern: /\b(leadership|learnum|soft skills?|non.?technical)\b/i,
    reply:
      "Beyond technical courses, AIIT also offers an online leadership development program through Learnum, built to grow professional and leadership skills alongside technical training.",
  },
  {
    pattern: /\b(legit|real|accredit|trust|scam)\b/i,
    reply:
      "Every AIIT certificate is independently verifiable: anyone (an employer, a university) can confirm a credential is real from its ID. Happy to point you to a specific course's certification details too.",
  },
];
