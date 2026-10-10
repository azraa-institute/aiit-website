import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { QuillLink, QuillTurn } from '@aiit/shared';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { sendQuillMessage } from '@/lib/quillChat';
import { QuillAvatar } from './QuillAvatar';
import './quill-chat.css';

interface ChatMessage {
  id: string;
  role: QuillTurn['role'];
  text: string;
  links?: QuillLink[];
  escalate?: boolean;
}

const OPENING_SUGGESTIONS = [
  'What will I learn?',
  'How will this help my career?',
  'How much does it cost?',
  'How do I enroll?',
];

function openingLine(courseTitle: string): string {
  return `Hi there \u{1F44B} I'm Quill. Ask me anything about ${courseTitle} — curriculum, price, how long it takes, or what you'll walk away with.`;
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
  courseSlug: string;
  courseTitle: string;
  open: boolean;
  onClose: () => void;
}

export function QuillChatPanel({ courseSlug, courseTitle, open, onClose }: QuillChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(OPENING_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const missCountRef = useRef(0);
  const seededRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || seededRef.current) return;
    seededRef.current = true;
    setMessages([{ id: 'opening', role: 'quill', text: openingLine(courseTitle) }]);
  }, [open, courseTitle]);

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (!open) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const visitorMsg: ChatMessage = { id: `v-${Date.now()}`, role: 'visitor', text: trimmed };
    const history: QuillTurn[] = [...messages, visitorMsg].map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, visitorMsg]);
    setInput('');
    setSuggestions([]);
    setSending(true);
    setError(false);

    try {
      const res = await sendQuillMessage(trimmed, courseSlug, history, missCountRef.current);
      missCountRef.current = res.matched ? 0 : missCountRef.current + 1;
      setMessages((prev) => [
        ...prev,
        { id: `q-${Date.now()}`, role: 'quill', text: res.reply, links: res.links, escalate: res.escalate },
      ]);
      setSuggestions(res.suggestions);
    } catch {
      setError(true);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // Portaled to <body> -- rendered from deep inside the sidebar's
  // [data-reveal] ancestor, which carries `will-change: transform`
  // permanently (see global.css) and so creates a containing block for any
  // `position: fixed` descendant; without the portal this panel would be
  // "fixed" relative to that card instead of the viewport.
  return createPortal(
    <div className="quill-chat__backdrop" onClick={onClose}>
      <div
        className="quill-chat__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Ask Quill about ${courseTitle}`}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="quill-chat__header">
          <QuillAvatar size={32} />
          <div className="quill-chat__header-text">
            <strong>Quill</strong>
            <span>AIIT course guide</span>
          </div>
          <button type="button" className="quill-chat__close" aria-label="Close" ref={closeRef} onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
              <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="quill-chat__body" ref={scrollRef}>
          {messages.map((m) => (
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
            placeholder={`Ask about ${courseTitle}...`}
            maxLength={500}
            aria-label="Message Quill"
          />
          <button type="submit" aria-label="Send" disabled={sending || !input.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
