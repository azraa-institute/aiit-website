import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { QuillChatPanel } from '@/components/course/QuillChatPanel';

export interface QuillOpenContext {
  courseSlug: string;
  courseTitle: string;
}

interface QuillContextValue {
  /** Omit `context` to open in general-assistant mode (the site-wide floating launcher); pass it to open course-scoped (a course page's own "Ask Quill" button). */
  open: (context?: QuillOpenContext) => void;
  close: () => void;
}

const QuillContext = createContext<QuillContextValue | null>(null);

/**
 * One Quill panel instance for the whole public site -- mounted once in
 * Layout.tsx, rather than CourseDetailPage owning its own. That's what
 * lets a conversation survive navigating between pages (course page ->
 * home -> back), and lets both the per-course "Ask Quill about this
 * course" button and the site-wide floating launcher (FloatingActions.tsx)
 * open the exact same chat, course-scoped or general depending on how
 * they called `open()`.
 */
export function QuillProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<QuillOpenContext | null>(null);

  const open = useCallback((ctx?: QuillOpenContext) => {
    setContext(ctx ?? null);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<QuillContextValue>(() => ({ open, close }), [open, close]);

  return (
    <QuillContext.Provider value={value}>
      {children}
      <QuillChatPanel open={isOpen} context={context} onClose={close} />
    </QuillContext.Provider>
  );
}

export function useQuill(): QuillContextValue {
  const ctx = useContext(QuillContext);
  if (!ctx) throw new Error('useQuill must be used within a QuillProvider');
  return ctx;
}
