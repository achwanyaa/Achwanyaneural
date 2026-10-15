import { z } from 'zod';
import { SYMBOL_IDS, TIMEFRAMES } from './types';
import type { SignalInput } from './signal';

/** A turn as the client keeps it. Only `user`/`assistant` turns without errors go to the model. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

export const AnalyzeRequestSchema = z.object({
  symbol: z.enum(SYMBOL_IDS),
  timeframe: z.enum(TIMEFRAMES),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** Newline-delimited JSON events streamed back by /api/analyze. */
export type AnalyzeEvent =
  | { type: 'text'; text: string }
  | { type: 'signal'; signal: SignalInput; feedPrice: number }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Model-ready history: drop error bubbles, start on a user turn, merge consecutive
 * same-role turns. Returns null if there is no trailing user question.
 */
export function toModelHistory(messages: Pick<ChatMessage, 'role' | 'content' | 'error'>[]): { role: 'user' | 'assistant'; content: string }[] | null {
  const clean = messages.filter((m) => !m.error && m.content.trim());
  const firstUser = clean.findIndex((m) => m.role === 'user');
  if (firstUser === -1) return null;
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of clean.slice(firstUser)) {
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n\n${m.content}`;
    else out.push({ role: m.role, content: m.content });
  }
  return out[out.length - 1]?.role === 'user' ? out : null;
}
