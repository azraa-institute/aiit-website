import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { QuillLink, QuillTurn } from '@aiit/shared';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { sendQuillMessage } from '@/lib/quillChat';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  conversationTitle,
  deleteConversation,
  loadConversations,
  upsertConversation,
  type QuillChatMessage,
  type QuillConversation,
} from '@/lib/quillHistory';
import { QuillAvatar } from './QuillAvatar';
import './quill-chat.css';

/** Mirrors QuillOpenContext in lib/QuillContext.tsx -- kept as a separate, structurally-matching type here (not imported from there) to avoid a circular import, since QuillContext mounts this component. */
type QuillPanelContext = { courseSlug: string; courseTitle: string } | null;

const COURSE_OPENING_SUGGESTIONS = [
  'What will I learn?',
  'How will this help my career?',
  'How much does it cost?',
  'How do I enroll?',
];
const GENERAL_OPENING_SUGGESTIONS = [
  'What courses do you offer?',
  'How do I get started?',
  'Is there a certificate?',
  'Talk to a human',
];

function openingLine(courseTitle?: string): string {
  return courseTitle
    ? `Hi there \u{1F44B} I'm Quill. Ask me anything about ${courseTitle} — curriculum, price, how long it takes, or what you'll walk away with.`
    : `Hi there \u{1F44B} I'm Quill, AIIT's guide. Ask me about any of our courses, how enrollment works, certificates, or anything else about AIIT.`;
}

function scopeKey(ctx: QuillPanelContext): string {
  return ctx ? `course:${ctx.courseSlug}` : 'general';
}

function newConversation(ctx: QuillPanelContext): QuillConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    courseSlug: ctx?.courseSlug,
    courseTitle: ctx?.courseTitle,
    messages: [{ id: 'opening', role: 'quill', text: openingLine(ctx?.courseTitle) }],
    missCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

const WhatsAppGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M19.05 4.94A10 10 0 0 0 3.5 17.02L2 22l5.1-1.34a10 10 0 0 0 4.78 1.22h.01A10 10 0 0 0 19.05 4.94Zm-7.16 15.4h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.03.79.81-2.95-.2-.31a8.32 8.32 0 1 1 15.42-4.42 8.33 8.33 0 0 1-8.27 8.32Zm4.56-6.23c-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.12-.17.25-.65.81-.79.98-.15.16-.29.18-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.13.16 1.75 2.66 4.23 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.14-1.19-.06-.1-.23-.16-.48-.29Z" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NewChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" aria-hidden="true">
    <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

function LinkChip({ link }: { link: QuillLink }) {
  const internal = link.url.startsWith('/');
  const className = `quill-chat__chip quill-chat__chip--${link.kind}`;
  const content = link.kind === 'whatsapp' ? (
    <>
      <WhatsAppGlyph /> {link.label}
    </>
  ) : (
    link.label
  );
  if (internal) {
    return (
      <Link to={link.url} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <a href={link.url} target="_blank" rel="noreferrer" className={className}>
      {content}
    </a>
  );
}

interface QuillChatPanelProps {
  context: QuillPanelContext;
  open: boolean;
  onClose: () => void;
}

export function QuillChatPanel({ context, open, onClose }: QuillChatPanelProps) {
  const [conversation, setConversationState] = useState<QuillConversation | null>(null);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [historyList, setHistoryList] = useState<QuillConversation[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(GENERAL_OPENING_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const missCountRef = useRef(0);
  const activeScopeKeyRef = useRef<string | null>(null);
  const conversationRef = useRef<QuillConversation | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  function setConversation(c: QuillConversation) {
    conversationRef.current = c;
    setConversationState(c);
  }

  function persistIfReal(c: QuillConversation | null) {
    if (c && c.messages.some((m) => m.role === 'visitor')) upsertConversation(c);
  }

  // Starts a fresh thread whenever the panel opens into a genuinely
  // different scope (general <-> a specific course, or a different course
  // than the one already active) -- the opening-with-a-course case
  // specifically guards against silently overwriting an in-progress
  // general conversation just because the visitor clicked a course page's
  // own "Ask Quill" button. Re-opening into the SAME scope (clicking "Ask
  // Quill" again on the same course page) is a no-op, same conversation.
  useEffect(() => {
    if (!open) return;
    const key = scopeKey(context);
    if (activeScopeKeyRef.current === key && conversationRef.current) return;
    persistIfReal(conversationRef.current);
    activeScopeKeyRef.current = key;
    setConversation(newConversation(context));
    setView('chat');
    setSuggestions(context ? COURSE_OPENING_SUGGESTIONS : GENERAL_OPENING_SUGGESTIONS);
    missCountRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (view === 'chat') scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation, view]);

  if (!open || !conversation) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !conversation) return;

    const visitorMsg: QuillChatMessage = { id: `v-${Date.now()}`, role: 'visitor', text: trimmed };
    const historyTurns: QuillTurn[] = [...conversation.messages, visitorMsg].map((m) => ({ role: m.role, text: m.text }));
    const withVisitor: QuillConversation = {
      ...conversation,
      messages: [...conversation.messages, visitorMsg],
      updatedAt: new Date().toISOString(),
    };
    setConversation(withVisitor);
    setInput('');
    setSuggestions([]);
    setSending(true);
    setError(false);

    try {
      const res = await sendQuillMessage(trimmed, conversation.courseSlug, historyTurns, missCountRef.current);
      missCountRef.current = res.matched ? 0 : missCountRef.current + 1;
      const withReply: QuillConversation = {
        ...withVisitor,
        messages: [
          ...withVisitor.messages,
          { id: `q-${Date.now()}`, role: 'quill', text: res.reply, links: res.links, escalate: res.escalate },
        ],
        missCount: missCountRef.current,
        updatedAt: new Date().toISOString(),
      };
      setConversation(withReply);
      upsertConversation(withReply);
      setSuggestions(res.suggestions);
    } catch {
      setError(true);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleNewChat() {
    persistIfReal(conversationRef.current);
    activeScopeKeyRef.current = scopeKey(context);
    setConversation(newConversation(context));
    setView('chat');
    setSuggestions(context ? COURSE_OPENING_SUGGESTIONS : GENERAL_OPENING_SUGGESTIONS);
    setError(false);
    missCountRef.current = 0;
  }

  function toggleHistory() {
    if (view === 'history') {
      setView('chat');
      return;
    }
    setHistoryList(loadConversations());
    setView('history');
  }

  function openHistoryConversation(c: QuillConversation) {
    persistIfReal(conversationRef.current);
    activeScopeKeyRef.current = c.courseSlug ? `course:${c.courseSlug}` : 'general';
    setConversation(c);
    missCountRef.current = c.missCount;
    setSuggestions([]);
    setError(false);
    setView('chat');
  }

  function handleDeleteHistory(id: string) {
    deleteConversation(id);
    setHistoryList(loadConversations());
  }

  const headerSubtitle = conversation.courseTitle ?? 'AIIT guide';
  const inputPlaceholder = conversation.courseTitle ? `Ask about ${conversation.courseTitle}...` : 'Ask Quill anything...';

  // Portaled to <body> -- rendered from deep inside layout chrome that may
  // carry `will-change: transform` (see global.css), which creates a
  // containing block for any `position: fixed` descendant; without the
  // portal this panel would be "fixed" relative to that ancestor instead
  // of the viewport.
  return createPortal(
    <div className="quill-chat__backdrop" onClick={onClose}>
      <div
        className="quill-chat__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Ask Quill${conversation.courseTitle ? ` about ${conversation.courseTitle}` : ''}`}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="quill-chat__header">
          <QuillAvatar size={32} />
          <div className="quill-chat__header-text">
            <strong>Quill</strong>
            <span>{headerSubtitle}</span>
          </div>
          <div className="quill-chat__header-actions">
            <button type="button" className="quill-chat__icon-btn" aria-label="New chat" onClick={handleNewChat}>
              <NewChatIcon />
            </button>
            <button
              type="button"
              className={cn('quill-chat__icon-btn', view === 'history' && 'is-active')}
              aria-label={view === 'history' ? 'Back to chat' : 'Chat history'}
              aria-pressed={view === 'history'}
              onClick={toggleHistory}
            >
              <HistoryIcon />
            </button>
            <button type="button" className="quill-chat__close" aria-label="Close" ref={closeRef} onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {view === 'history' ? (
          <div className="quill-chat__history">
            {historyList.length === 0 ? (
              <p className="quill-chat__history-empty">No past conversations yet.</p>
            ) : (
              <ul className="quill-chat__history-list">
                {historyList.map((c) => (
                  <li key={c.id} className="quill-chat__history-row">
                    <button type="button" className="quill-chat__history-open" onClick={() => openHistoryConversation(c)}>
                      <span className="quill-chat__history-title">{conversationTitle(c)}</span>
                      <span className="quill-chat__history-meta">
                        {c.courseTitle ? `${c.courseTitle} · ` : ''}
                        {formatDate(c.updatedAt, { day: 'numeric', month: 'short' })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="quill-chat__history-delete"
                      aria-label={`Delete conversation: ${conversationTitle(c)}`}
                      onClick={() => handleDeleteHistory(c.id)}
                    >
                      <DeleteIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="quill-chat__body" ref={scrollRef}>
              {conversation.messages.map((m) => (
                <div key={m.id} className={`quill-chat__row quill-chat__row--${m.role}`}>
                  {m.role === 'quill' && <QuillAvatar size={24} />}
                  <div className={`quill-chat__bubble quill-chat__bubble--${m.role}${m.escalate ? ' quill-chat__bubble--escalate' : ''}`}>
                    {m.text}
                    {m.links && m.links.length > 0 && (
                      <div className="quill-chat__chips">
                        {m.links.map((l) => (
                          <LinkChip key={l.url} link={l} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="quill-chat__row quill-chat__row--quill">
                  <QuillAvatar size={24} />
                  <div className="quill-chat__bubble quill-chat__bubble--quill quill-chat__bubble--typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              {error && (
                <p className="quill-chat__error">
                  Something went wrong reaching Quill. You can also reach us directly on{' '}
                  <a href="https://wa.me/919342295383" target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                  .
                </p>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="quill-chat__suggestions">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="quill-chat__suggestion" onClick={() => send(s)} disabled={sending}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              className="quill-chat__input-row"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                maxLength={500}
                aria-label="Message Quill"
              />
              <button type="submit" aria-label="Send" disabled={sending || !input.trim()}>
                <SendIcon />
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
