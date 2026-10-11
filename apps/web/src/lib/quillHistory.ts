import type { QuillLink, QuillTurnRole } from '@aiit/shared';

export interface QuillChatMessage {
  id: string;
  role: QuillTurnRole;
  text: string;
  links?: QuillLink[];
  escalate?: boolean;
}

/**
 * One Quill thread, persisted client-side only (localStorage) -- Quill's
 * server is stateless (see QuillChatRequest's own doc comments), so there's
 * nothing to tie this to server-side and no account needed, matching Quill
 * being reachable by anonymous visitors anywhere on the site, not just
 * signed-in learners.
 */
export interface QuillConversation {
  id: string;
  /** Unset for a general-mode conversation (opened from the site-wide floating launcher, not a course page). */
  courseSlug?: string;
  courseTitle?: string;
  messages: QuillChatMessage[];
  missCount: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'quill:conversations';
/** Oldest dropped past this -- plenty for a visitor's own browsing session without the list growing unbounded. */
const MAX_CONVERSATIONS = 20;

function readAll(): QuillConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QuillConversation[]) : [];
  } catch {
    // Private browsing, blocked storage, or corrupt JSON -- history just doesn't persist this session.
    return [];
  }
}

function writeAll(conversations: QuillConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
  } catch {
    // Same as above -- nothing to recover from, just skip persisting.
  }
}

/** Most-recently-updated first. */
export function loadConversations(): QuillConversation[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertConversation(conversation: QuillConversation): void {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) all[idx] = conversation;
  else all.unshift(conversation);
  writeAll(all);
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

const TITLE_MAX = 60;

/** First thing the visitor actually asked, else the course it was about, else a generic fallback -- in that order of usefulness for picking a thread back out of a list. */
export function conversationTitle(conversation: QuillConversation): string {
  const firstVisitorMessage = conversation.messages.find((m) => m.role === 'visitor')?.text.trim();
  if (firstVisitorMessage) {
    return firstVisitorMessage.length > TITLE_MAX ? `${firstVisitorMessage.slice(0, TITLE_MAX - 1)}…` : firstVisitorMessage;
  }
  return conversation.courseTitle ?? 'New conversation';
}
