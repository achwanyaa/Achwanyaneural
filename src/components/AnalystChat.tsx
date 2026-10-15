'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/chat';
import { TIMEFRAME_LABEL } from '@/lib/symbols';
import type { SymbolId, Timeframe } from '@/lib/types';
import { btn } from './ui';

const QUICK_PROMPTS = [
  { label: 'Trade setup', text: 'Analyze the current chart and give me a trade setup with entry, stop loss and take profit.' },
  { label: 'Structure & bias', text: 'What is the current market structure and bias? Point out key liquidity and order block levels.' },
  { label: 'Levels to watch', text: 'Which levels should I watch next, and what would invalidate the current bias?' },
];

interface Props {
  symbol: SymbolId;
  timeframe: Timeframe;
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
}

export default function AnalystChat({ symbol, timeframe, messages, loading, onSend, onStop, onClear }: Props) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loading]);

  const submit = (text: string) => {
    if (!text.trim() || loading) return;
    onSend(text);
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="px-3 py-4 text-[13px] leading-relaxed text-muted">
            Ask about {symbol} on the {TIMEFRAME_LABEL[timeframe]} chart. The analyst reads the latest bars from the feed. When it proposes a
            setup, the levels appear on the chart and in Signal.
          </p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`border-b border-line px-3 py-2.5 ${m.role === 'user' ? 'bg-raised/40' : ''}`}>
              <h3 className={`mb-0.5 text-[11px] font-semibold ${m.error ? 'text-down' : 'text-faint'}`}>
                {m.error ? 'Error' : m.role === 'user' ? 'You' : 'Analyst'}
              </h3>
              <p className={`whitespace-pre-wrap text-[13px] leading-relaxed ${m.error ? 'text-down' : ''}`}>{m.content}</p>
            </article>
          ))
        )}
        {loading && <p className="px-3 py-2.5 text-xs text-muted">Analyst is reading {symbol} {TIMEFRAME_LABEL[timeframe]}…</p>}
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t border-line p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => submit(p.text)}
              disabled={loading}
              className="h-6 rounded-[3px] border border-line px-2 text-xs text-muted hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
          {messages.length > 0 && (
            <button onClick={onClear} className="ml-auto h-6 px-1 text-xs text-faint hover:text-ink">
              Clear
            </button>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${symbol}…`}
            className="h-8 min-w-0 flex-1 rounded-[3px] border border-line-strong bg-bg px-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
          {loading ? (
            <button type="button" onClick={onStop} className={`${btn.base} ${btn.secondary}`}>
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className={`${btn.base} ${btn.primary}`}>
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
