import type { QuillChatRequest, QuillChatResponse, QuillTurn } from '@aiit/shared';
import { apiFetch } from './api';

const MAX_HISTORY_TURNS = 8;

/** Sends one visitor message to Quill -- stateless on the server, so the recent turns + miss streak are resent each time (see QuillChatRequest's own doc comments for why). */
export function sendQuillMessage(
  message: string,
  courseSlug: string,
  history: QuillTurn[],
  missCount: number,
): Promise<QuillChatResponse> {
  const body: QuillChatRequest = {
    message,
    courseSlug,
    history: history.slice(-MAX_HISTORY_TURNS),
    missCount,
  };
  return apiFetch<QuillChatResponse>('/quill/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
