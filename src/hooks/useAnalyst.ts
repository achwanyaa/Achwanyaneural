'use client';

import { useCallback, useRef, useState } from 'react';
import { toModelHistory, type AnalyzeEvent, type ChatMessage } from '@/lib/chat';
import type { SignalInput } from '@/lib/signal';
import { formatPrice } from '@/lib/symbols';
import type { SymbolId, Timeframe } from '@/lib/types';

let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

function signalSummary(symbol: SymbolId, s: SignalInput): string {
  if (s.direction === 'no_trade') return `Signal: no trade (${s.confidence}% confidence).`;
  return `Signal: ${s.direction.toUpperCase()} ${symbol} @ ${formatPrice(symbol, s.entry)} · SL ${formatPrice(symbol, s.stop_loss)} · TP ${formatPrice(symbol, s.take_profit)} · ${s.confidence}% confidence.`;
}

export function useAnalyst(symbol: SymbolId, tf: Timeframe, onSignal: (s: SignalInput, feedPrice: number) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const update = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || loading) return;
      const userMsg: ChatMessage = { id: newId(), role: 'user', content: question };
      const replyId = newId();
      const history = toModelHistory([...messages, userMsg]);
      if (!history) return;
      setMessages((ms) => [...ms, userMsg, { id: replyId, role: 'assistant', content: '' }]);

      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, timeframe: tf, messages: history.slice(-40) }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Analysis failed (HTTP ${res.status})`);
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as AnalyzeEvent;
            if (event.type === 'text') {
              update(replyId, (m) => ({ ...m, content: m.content + event.text }));
            } else if (event.type === 'signal') {
              update(replyId, (m) => ({ ...m, content: `${m.content.trimEnd()}\n\n${signalSummary(symbol, event.signal)}` }));
              onSignal(event.signal, event.feedPrice);
            } else if (event.type === 'error') {
              setMessages((ms) => [...ms, { id: newId(), role: 'assistant', content: event.message, error: true }]);
            }
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setMessages((ms) => [
            ...ms,
            { id: newId(), role: 'assistant', content: err instanceof Error ? err.message : 'Analysis failed', error: true },
          ]);
        }
      } finally {
        // Drop the placeholder if nothing streamed into it.
        setMessages((ms) => ms.filter((m) => m.id !== replyId || m.content.trim()));
        setLoading(false);
        abortRef.current = null;
      }
    },
    [loading, messages, onSignal, symbol, tf],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, loading, send, stop, clear };
}
