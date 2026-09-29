/** Lightweight, ephemeral emoji reactions -- fire-and-forget over the data channel, never persisted. */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '❓'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
}

export function newReactionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
