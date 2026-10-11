import { Injectable } from '@nestjs/common';
import type { CatalogueCategorySlug, CourseDetail, CourseListItem, QuillChatResponse, QuillLink } from '@aiit/shared';
import { CoursesService } from '../courses/courses.service';
import { QUILL_ARTICLES, QUILL_CAREER_ARTICLES, articlesForCategory, type QuillArticle } from './quill-content.data';
import { QUILL_GENERAL_FACTS } from './quill-general-facts.data';
import { QuillChatDto } from './dto/quill-chat.dto';

const EMAIL = 'info@aiit.network';
const PHONE_DISPLAY = '+91 93422 95383';
const WHATSAPP_DIGITS = '919342295383';
const YOUTUBE_URL = 'https://www.youtube.com/@AIIT.Network';

const COMMON_SUGGESTIONS = [
  'What will I learn?',
  'How will this help my career?',
  'How much does it cost?',
  'How do I enroll?',
];

const GENERAL_SUGGESTIONS = [
  'What courses do you offer?',
  'How do I get started?',
  'Is there a certificate?',
  'Talk to a human',
];

/** Checked before the per-course Intent classifier in general mode -- "which course should I take" has no equivalent in a single-course conversation. */
const COURSES_LIST_PATTERN = /\b(what courses|which course|courses? (do|you) (offer|have|teach)|recommend(ed)? (a )?course|catalog(ue)?|list of courses)\b/i;

type Intent =
  | 'human'
  | 'price'
  | 'duration_level'
  | 'certificate'
  | 'enroll'
  | 'career'
  | 'curriculum'
  | 'articles'
  | 'video'
  | 'overview'
  | 'greeting'
  | 'thanks';

// Checked in this order -- a compound message ("how much does it cost and
// how long is it") lands on whichever substantive topic is listed first,
// and an explicit ask for a human always wins outright. Greeting/thanks are
// deliberately last: short conversational openers only win when nothing
// more specific matched.
const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['human', /\b(human|real person|agent|representative|customer (service|support)|talk to (someone|a person|a human))\b/i],
  ['price', /\b(price|cost|fees?|how much|afford|discount|instal?ments?|pay(ment)?s?)\b/i],
  ['duration_level', /\b(how long|duration|how many (weeks|hours|months)|time commitment|finish|level|beginner|advanced|prerequisite|requirement|background needed|experience needed)\b/i],
  ['certificate', /\b(certificat|credential|accredit)/i],
  ['enroll', /\b(enrol?l|sign ?up|register|join|get started|how do i start|buy|checkout)\b/i],
  ['career', /\b(job|career|salary|hire|hiring|worth it|impact|future|opportunit|profession|promotion)\b/i],
  ['curriculum', /\b(learn|cover|syllabus|curriculum|topics|modules|module|teach|inside|content|skills?)\b/i],
  ['articles', /\b(article|blog|read more|resources?)\b/i],
  ['video', /\b(video|watch|demo|youtube)\b/i],
  ['overview', /\b(tell me about|what is this|overview|about this course|summary|describe)\b/i],
  ['greeting', /\b(hi|hello|hey|good (morning|afternoon|evening))\b/i],
  ['thanks', /\b(thanks|thank you|appreciate|cheers)\b/i],
];

function classify(message: string): Intent | null {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(message)) return intent;
  }
  return null;
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'Members only';
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function courseLink(course: Pick<CourseListItem, 'slug' | 'title'>): QuillLink {
  return { label: `View ${course.title}`, url: `/courses/${course.slug}`, kind: 'course' };
}

function coursesLink(): QuillLink {
  return { label: 'Browse all AIIT courses', url: '/courses', kind: 'courses' };
}

function enrollLink(course: CourseDetail): QuillLink {
  return { label: 'Enroll now', url: `/courses/${course.slug}`, kind: 'enroll' };
}

function articleLink(article: QuillArticle): QuillLink {
  return { label: article.title, url: `/resources/${article.slug}`, kind: 'article' };
}

function videoLink(): QuillLink {
  return { label: 'AIIT on YouTube', url: YOUTUBE_URL, kind: 'video' };
}

function whatsappLink(courseTitle?: string): QuillLink {
  const text = encodeURIComponent(
    courseTitle
      ? `Hello AIIT, I have a question about "${courseTitle}" that Quill couldn't answer.`
      : "Hello AIIT, I have a question that Quill couldn't answer.",
  );
  return { label: 'Chat with our team on WhatsApp', url: `https://wa.me/${WHATSAPP_DIGITS}?text=${text}`, kind: 'whatsapp' };
}

function emailLink(): QuillLink {
  return { label: EMAIL, url: `mailto:${EMAIL}`, kind: 'email' };
}

function phoneLink(): QuillLink {
  return { label: PHONE_DISPLAY, url: 'tel:+919342295383', kind: 'phone' };
}

function articlesFor(course: CourseDetail): QuillArticle[] {
  const matched = articlesForCategory(course.catalogueCategory.slug as CatalogueCategorySlug, 2);
  return matched.length > 0 ? matched : QUILL_CAREER_ARTICLES.slice(0, 2);
}

/**
 * Quill's answer engine. Rule-based today -- every reply is built from real
 * course data (CoursesService, the same public catalogue CourseDetailPage
 * itself renders) plus a small hand-picked article index
 * (quill-content.data.ts), no model call involved. Designed so a real LLM
 * can take over later without the contract around it changing: once
 * XAI_API_KEY is set (see apps/api/.env.example), the natural seam is right
 * here in `respond()` -- branch on whether the key is configured, and if so
 * hand the same `course`/`history` context this rule engine already builds
 * to a Grok call instead, falling back to this engine if that call fails.
 * Not wired up yet since there's no key to call with.
 */
@Injectable()
export class QuillService {
  constructor(private readonly courses: CoursesService) {}

  async respond(dto: QuillChatDto, headers: Record<string, string | string[] | undefined>): Promise<QuillChatResponse> {
    // No courseSlug -- opened from the site-wide floating launcher (see
    // apps/web's FloatingActions) rather than a course page's own "Ask
    // Quill about this course" button. Answer from the catalogue + general
    // AIIT facts instead of one specific course.
    if (!dto.courseSlug) return this.respondGeneral(dto, headers);

    // Same currency resolution as the course page itself (cf-ipcountry
    // header) -- otherwise Quill could quote a price in a different
    // currency than the page the visitor is already looking at.
    const course = await this.courses.detail(dto.courseSlug, { headers });
    const intent = classify(dto.message);
    const missCount = dto.missCount ?? 0;

    if (intent === null) {
      if (missCount >= 1) return this.escalate(course, true);
      return {
        reply: pick([
          `Hmm, I'm not totally sure I caught that 🤔 I'm best with questions about ${course.title}'s curriculum, pricing, certification, and career impact. Try one of these, or rephrase?`,
          `I didn't quite follow that one — I can help most with what you'll learn, cost, duration, certification, or how to enroll in ${course.title}. What would help?`,
        ]),
        suggestions: COMMON_SUGGESTIONS,
        links: [courseLink(course)],
        matched: false,
        escalate: false,
      };
    }

    switch (intent) {
      case 'human':
        return this.escalate(course, true);
      case 'price':
        return this.answerPrice(course);
      case 'duration_level':
        return this.answerDurationLevel(course);
      case 'certificate':
        return this.answerCertificate(course);
      case 'enroll':
        return this.answerEnroll(course);
      case 'career':
        return this.answerCareer(course);
      case 'curriculum':
        return this.answerCurriculum(course);
      case 'articles':
        return this.answerArticles(course);
      case 'video':
        return this.answerVideo(course);
      case 'overview':
        return this.answerOverview(course);
      case 'greeting':
        return this.answerGreeting(course);
      case 'thanks':
        return {
          reply: pick([
            `Anytime! Let me know if anything else comes up about ${course.title} — or any other AIIT course.`,
            `Happy to help. I'm right here if more questions come up while you're deciding.`,
          ]),
          suggestions: COMMON_SUGGESTIONS,
          links: [],
          matched: true,
          escalate: false,
        };
    }
  }

  /**
   * General-assistant mode -- no single course in context (see `respond`'s
   * branch above). Answers from the real course catalogue
   * (CoursesService.list, the same data /courses itself renders) plus a
   * small curated fact list (quill-general-facts.data.ts) for "what is
   * AIIT"-style questions the per-course Intent taxonomy doesn't cover.
   * Reuses the same Intent classifier as the per-course engine for
   * everything else (price, duration, certificate, career, ...) so the two
   * modes stay behaviourally consistent, just without one course to anchor
   * the wording to.
   */
  private async respondGeneral(
    dto: QuillChatDto,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<QuillChatResponse> {
    const missCount = dto.missCount ?? 0;

    if (COURSES_LIST_PATTERN.test(dto.message)) {
      return this.answerCoursesList(await this.courses.list({ headers }));
    }

    const fact = QUILL_GENERAL_FACTS.find((f) => f.pattern.test(dto.message));
    if (fact) {
      return { reply: fact.reply, suggestions: GENERAL_SUGGESTIONS, links: [coursesLink()], matched: true, escalate: false };
    }

    const intent = classify(dto.message);
    if (intent === null) {
      if (missCount >= 1) return this.escalate(null, true);
      return {
        reply: pick([
          "Hmm, I'm not totally sure I caught that 🤔 I can help with what AIIT offers, pricing, certification, or picking the right course. Try one of these, or rephrase?",
          "I didn't quite follow that one — I can help most with what AIIT teaches, cost, certification, or how to enroll. What would help?",
        ]),
        suggestions: GENERAL_SUGGESTIONS,
        links: [coursesLink()],
        matched: false,
        escalate: false,
      };
    }

    switch (intent) {
      case 'human':
        return this.escalate(null, true);
      case 'price':
        return {
          reply:
            'Pricing varies by course -- plenty are completely free, others are a one-time fee or included with membership. Browse the catalogue to see exact pricing for each.',
          suggestions: GENERAL_SUGGESTIONS,
          links: [coursesLink()],
          matched: true,
          escalate: false,
        };
      case 'duration_level':
        return {
          reply:
            "Course length depends on what you pick -- anywhere from a few weeks to several months, at levels from absolute-beginner through advanced.",
          suggestions: GENERAL_SUGGESTIONS,
          links: [coursesLink()],
          matched: true,
          escalate: false,
        };
      case 'certificate':
        return {
          reply:
            'Every AIIT course ends in a certificate, and every certificate is independently verifiable -- anyone (an employer, a university) can confirm it from its credential ID.',
          suggestions: GENERAL_SUGGESTIONS,
          links: [coursesLink()],
          matched: true,
          escalate: false,
        };
      case 'enroll':
        return {
          reply: 'Browse the courses below, pick one that fits your goals, and tap Enroll on its page -- most are available to start right away.',
          suggestions: GENERAL_SUGGESTIONS,
          links: [coursesLink()],
          matched: true,
          escalate: false,
        };
      case 'career':
        return {
          reply:
            "AIIT's programs are built around skills employers are actively hiring for right now across AI, cloud, cybersecurity, data, and more. Picking a course that matches your goals is the best place to start.",
          suggestions: GENERAL_SUGGESTIONS,
          links: [coursesLink(), ...QUILL_CAREER_ARTICLES.slice(0, 1).map(articleLink)],
          matched: true,
          escalate: false,
        };
      case 'curriculum':
      case 'overview':
        return this.answerCoursesList(await this.courses.list({ headers }));
      case 'articles':
        return {
          reply: `A couple of reads worth a look: ${QUILL_CAREER_ARTICLES.slice(0, 2).map((a) => `"${a.title}"`).join(' and ')}. Both are on the AIIT blog, free to read.`,
          suggestions: GENERAL_SUGGESTIONS,
          links: QUILL_CAREER_ARTICLES.slice(0, 2).map(articleLink),
          matched: true,
          escalate: false,
        };
      case 'video':
        return {
          reply: "AIIT's YouTube channel has walkthroughs and explainers across our course categories.",
          suggestions: GENERAL_SUGGESTIONS,
          links: [videoLink()],
          matched: true,
          escalate: false,
        };
      case 'greeting':
        return {
          reply: pick([
            "Hi there 👋 I'm Quill, AIIT's guide. Ask me about any of our courses, how enrollment works, certificates, or anything else about AIIT.",
            "Hey! I'm Quill. I can help you find the right course, explain pricing or certification, or just answer questions about AIIT. What would you like to know?",
          ]),
          suggestions: GENERAL_SUGGESTIONS,
          links: [],
          matched: true,
          escalate: false,
        };
      case 'thanks':
        return {
          reply: pick([
            'Anytime! Let me know if anything else comes up.',
            "Happy to help. I'm right here if more questions come up.",
          ]),
          suggestions: GENERAL_SUGGESTIONS,
          links: [],
          matched: true,
          escalate: false,
        };
    }
  }

  private answerCoursesList(courses: CourseListItem[]): QuillChatResponse {
    const picks = courses.slice(0, 4);
    const titles = picks.map((c) => c.title).join(', ');
    return {
      reply:
        picks.length > 0
          ? `AIIT's catalogue covers a lot of ground -- a few to start with: ${titles}. Browse the full list to see everything, filterable by level and category.`
          : "I can't load the course list right now -- the full catalogue is always up to date on the Courses page.",
      suggestions: GENERAL_SUGGESTIONS,
      links: [...picks.map(courseLink), coursesLink()],
      matched: true,
      escalate: false,
    };
  }

  private escalate(course: CourseDetail | null, explicit: boolean): QuillChatResponse {
    return {
      reply: explicit
        ? `Good call — let's get you a real person rather than me guessing. Our team is fastest on WhatsApp, or you can email ${EMAIL} or call ${PHONE_DISPLAY} (Mon–Sat, 8am–6pm IST).`
        : `I don't want to keep guessing on this one — let's get you a real person. Our team is fastest on WhatsApp, or email ${EMAIL} / call ${PHONE_DISPLAY} (Mon–Sat, 8am–6pm IST).`,
      suggestions: [],
      links: [whatsappLink(course?.title), emailLink(), phoneLink()],
      matched: true,
      escalate: true,
    };
  }

  private answerGreeting(course: CourseDetail): QuillChatResponse {
    return {
      reply: pick([
        `Hey! I'm Quill, AIIT's course guide. I can tell you what you'll learn in ${course.title}, how it helps your career, pricing, duration, or how to get certified. What would you like to know?`,
        `Hi there 👋 I'm Quill. Ask me anything about ${course.title} — curriculum, price, how long it takes, or what you'll walk away with.`,
      ]),
      suggestions: COMMON_SUGGESTIONS,
      links: [],
      matched: true,
      escalate: false,
    };
  }

  private answerOverview(course: CourseDetail): QuillChatResponse {
    return {
      reply: `${course.summary} ${truncate(course.description, 260)}`,
      suggestions: ['What will I learn?', 'How will this help my career?', 'How much does it cost?'],
      links: [courseLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerCurriculum(course: CourseDetail): QuillChatResponse {
    const techNames = course.technologies.slice(0, 4).map((t) => t.name);
    const techLine =
      techNames.length > 0
        ? `You'll work with ${techNames.join(', ')}${course.technologies.length > 4 ? ', and more' : ''}.`
        : '';
    const outcomeLines = course.outcomes.slice(0, 4).map((o) => `• ${o}`).join('\n');
    const reply = [
      `In ${course.title}, ${techLine}`.trim(),
      outcomeLines ? `By the end, you'll be able to:\n${outcomeLines}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      reply: reply || course.summary,
      suggestions: ['How will this help my career?', 'How long does it take?', 'How do I enroll?'],
      links: [courseLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerCareer(course: CourseDetail): QuillChatResponse {
    const audience = course.audience[0] ?? 'people looking to break into this field';
    const outcomes = course.outcomes.slice(0, 2);
    const outcomeLine = outcomes.length > 0 ? ` able to ${outcomes.join(' and ').toLowerCase()}` : '';
    const reply = `${course.title} is built for ${audience}. Graduates walk away${outcomeLine} — skills ${course.categoryName} employers are actively hiring for right now. You'll also earn ${course.certification}, AIIT's verifiable credential for your resume or LinkedIn.`;

    const articles = articlesFor(course);
    return {
      reply,
      suggestions: ['How much does it cost?', 'How do I enroll?', 'Is there a certificate?'],
      links: [...articles.map(articleLink), courseLink(course), coursesLink()],
      matched: true,
      escalate: false,
    };
  }

  private answerPrice(course: CourseDetail): QuillChatResponse {
    let reply: string;
    if (course.pricing === 'free') {
      reply = `Good news — ${course.title} is completely free to join.`;
    } else if (course.pricing === 'subscription') {
      reply = `${course.title} is included with AIIT membership — no separate course fee.`;
    } else {
      const price = formatPrice(course.price.amountCents, course.price.currency);
      const discount =
        course.price.wasAmountCents != null
          ? ` (down from ${formatPrice(course.price.wasAmountCents, course.price.currency)})`
          : '';
      reply = `${course.title} is ${price}${discount}. You can pay with PayPal, Razorpay, or Paystack depending on your region — tap Enroll now on this page and checkout opens right there.`;
    }

    return {
      reply,
      suggestions: ['How do I enroll?', 'Is there a certificate?', 'How long does it take?'],
      links: [enrollLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerDurationLevel(course: CourseDetail): QuillChatResponse {
    const reqs = course.requirements.length > 0
      ? `What you'll need going in: ${course.requirements.slice(0, 3).join(', ')}.`
      : `No specific prerequisites — just curiosity and a willingness to practice.`;
    return {
      reply: `${course.title} is a ${course.durationLabel} program at ${course.level} level. ${reqs}`,
      suggestions: ['What will I learn?', 'How much does it cost?', 'How do I enroll?'],
      links: [courseLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerCertificate(course: CourseDetail): QuillChatResponse {
    return {
      reply: `${course.certification} Every AIIT certificate is independently verifiable — anyone (an employer, a university) can confirm yours is real from its credential ID.`,
      suggestions: ['How will this help my career?', 'How much does it cost?', 'How do I enroll?'],
      links: [courseLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerEnroll(course: CourseDetail): QuillChatResponse {
    let note: string;
    if (course.pricing === 'free') note = "It's free, so there's nothing to pay at checkout.";
    else if (course.pricing === 'subscription') note = "It's included with AIIT membership.";
    else note = `It's ${formatPrice(course.price.amountCents, course.price.currency)}, paid securely at checkout.`;

    return {
      reply: `Ready to jump in? Scroll up and tap "Enroll now" on this page — checkout takes under a minute. ${note}`,
      suggestions: ['Is there a certificate?', 'How will this help my career?'],
      links: [enrollLink(course)],
      matched: true,
      escalate: false,
    };
  }

  private answerArticles(course: CourseDetail): QuillChatResponse {
    const articles = articlesFor(course);
    const titles = articles.map((a) => `"${a.title}"`).join(' and ');
    return {
      reply: articles.length > 0
        ? `A couple of reads that pair well with ${course.title}: ${titles}. Both are on the AIIT blog, free to read.`
        : `I don't have a specific article queued for this course yet, but the AIIT blog (Resources) has plenty on breaking into tech.`,
      suggestions: ['How will this help my career?', 'How do I enroll?'],
      links: articles.map(articleLink),
      matched: true,
      escalate: false,
    };
  }

  private answerVideo(course: CourseDetail): QuillChatResponse {
    const articles = articlesFor(course);
    const withVideo = QUILL_ARTICLES.find((a) => a.hasVideo && articles.includes(a));
    const reply = withVideo
      ? `There's a short video walkthrough inside the article "${withVideo.title}" — and our YouTube channel has more on ${course.categoryName}.`
      : `I don't have a video queued for this exact course yet, but AIIT's YouTube channel covers ${course.categoryName} and related topics.`;
    return {
      reply,
      suggestions: ['What will I learn?', 'How will this help my career?'],
      links: withVideo ? [articleLink(withVideo), videoLink()] : [videoLink()],
      matched: true,
      escalate: false,
    };
  }
}
