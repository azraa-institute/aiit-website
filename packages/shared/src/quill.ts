/**
 * Quill -- AIIT's site-wide assistant (a persistent floating launcher on
 * every public page, see apps/web's QuillContext/FloatingActions) that
 * also answers course-specific questions when opened from a course page's
 * own "Ask Quill about this course" button (apps/web's CourseDetailPage).
 * Answers come from a rule-based engine over real course + article data
 * (no LLM wired up yet) -- see apps/api's QuillService doc comment for how
 * a real model plugs in later without this contract changing.
 */

export type QuillTurnRole = 'visitor' | 'quill';

export interface QuillTurn {
  role: QuillTurnRole;
  text: string;
}

export type QuillLinkKind = 'course' | 'courses' | 'article' | 'video' | 'whatsapp' | 'email' | 'phone' | 'enroll';

export interface QuillLink {
  label: string;
  url: string;
  kind: QuillLinkKind;
}

export interface QuillChatRequest {
  message: string;
  /** Omitted when Quill was opened from the site-wide floating launcher rather than a course page -- the server answers in general-assistant mode instead of anchoring every reply to one course. */
  courseSlug?: string;
  /**
   * A short rolling window of the conversation so far, oldest first -- Quill
   * keeps no server-side session, so this is what gives it any continuity
   * (e.g. "and how long is it?" right after asking about price). The client
   * caps this itself (see quillChat.ts) rather than trusting an unbounded
   * body.
   */
  history?: QuillTurn[];
  /**
   * How many *consecutive* replies just before this one came back with
   * `matched: false` (the client tracks this locally, see quillChat.ts).
   * Lets the rule engine escalate to a human after it has genuinely failed
   * twice in a row, rather than on the very first thing it can't parse.
   */
  missCount?: number;
}

export interface QuillChatResponse {
  reply: string;
  /** Quick-reply chips the visitor can tap instead of typing. */
  suggestions: string[];
  links: QuillLink[];
  /** False when this reply is a "I'm not sure I caught that" fallback -- the client uses this to drive missCount. */
  matched: boolean;
  /** True only when Quill is handing off to a human (explicit ask, or two misses in a row) -- the client renders a distinct "talk to our team" card rather than a normal bubble. */
  escalate: boolean;
}
