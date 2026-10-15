'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bridge, BridgeError, type BridgeQuote, type BridgeSettings, type TradePreview, type TradeResult } from '@/lib/bridge';
import { applyBasisOffset, executionProblems, type TradeSignal } from '@/lib/signal';
import { SYMBOLS } from '@/lib/symbols';
import { btn, KV, Notice } from './ui';

interface Props {
  signal: TradeSignal;
  settings: BridgeSettings;
  demo: boolean;
  /** Latest price from the chart feed, used to measure the feed→broker gap. */
  feedPrice: number;
  onClose: () => void;
  onPlaced: (result: TradeResult) => void;
}

type Step =
  | { kind: 'loading' }
  | { kind: 'blocked'; problems: string[] }
  | { kind: 'ready' }
  | { kind: 'sending' }
  | { kind: 'done'; result: TradeResult }
  | { kind: 'error'; message: string };

const round = (n: number, digits: number) => Number(n.toFixed(digits));

export default function TradeTicket({ signal, settings, demo, feedPrice, onClose, onPlaced }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [adjusted, setAdjusted] = useState<TradeSignal | null>(null);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  // Measure the feed→broker gap once, when the ticket opens, not on every chart refresh.
  const [feedAtOpen] = useState(feedPrice);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = await bridge.quote(settings, signal.symbol);
        if (cancelled) return;
        const mid = (q.bid + q.ask) / 2;
        const shifted = applyBasisOffset(signal, mid - feedAtOpen);
        const adj = { ...shifted, stopLoss: round(shifted.stopLoss, q.digits), takeProfit: round(shifted.takeProfit, q.digits) };
        setQuote(q);
        setAdjusted(adj);

        const live = signal.side === 'buy' ? q.ask : q.bid;
        const problems = executionProblems(adj, live);
        if (problems.length) {
          setStep({ kind: 'blocked', problems });
          return;
        }
        const p = await bridge.preview(settings, { symbol: signal.symbol, side: signal.side, sl: adj.stopLoss, tp: adj.takeProfit, risk_pct: settings.riskPct });
        if (cancelled) return;
        setPreview(p);
        setStep({ kind: 'ready' });
      } catch (err) {
        if (!cancelled) setStep({ kind: 'error', message: err instanceof BridgeError ? err.message : 'Could not prepare the order' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedAtOpen, settings, signal]);

  async function confirm() {
    if (!adjusted || !preview) return;
    setStep({ kind: 'sending' });
    try {
      const result = await bridge.trade(settings, { symbol: signal.symbol, side: signal.side, sl: adjusted.stopLoss, tp: adjusted.takeProfit, lots: preview.lots });
      setStep({ kind: 'done', result });
      onPlaced(result);
    } catch (err) {
      setStep({ kind: 'error', message: err instanceof BridgeError ? err.message : 'Order failed' });
    }
  }

  const buy = signal.side === 'buy';
  const digits = quote?.digits ?? SYMBOLS[signal.symbol].digits;
  const fmt = (n: number | undefined) => (n == null ? '—' : n.toFixed(digits));
  const offset = adjusted ? adjusted.entry - signal.entry : 0;

  const rows: { label: string; value: string; cls?: string }[] = [];
  if (quote && adjusted) {
    rows.push(
      { label: 'Broker bid / ask', value: `${fmt(quote.bid)} / ${fmt(quote.ask)}` },
      { label: 'Stop loss', value: fmt(adjusted.stopLoss), cls: 'text-down' },
      { label: 'Take profit', value: fmt(adjusted.takeProfit), cls: 'text-up' },
    );
    if (Math.abs(offset) > 0) rows.push({ label: 'Moved from chart levels by', value: `${offset >= 0 ? '+' : ''}${offset.toFixed(digits)}`, cls: 'text-muted' });
  }
  if (preview) {
    rows.push(
      { label: 'Volume', value: `${preview.lots} lots` },
      { label: `Risk (${settings.riskPct}% of balance)`, value: `${preview.risk_money.toFixed(2)} ${preview.currency}`, cls: 'text-down' },
      { label: 'Potential reward', value: `${preview.reward_money.toFixed(2)} ${preview.currency}`, cls: 'text-up' },
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm order"
        className="w-full max-w-[380px] rounded-[4px] border border-line-strong bg-panel shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-10 items-center justify-between border-b border-line px-4">
          <h2 className="text-[13px] font-semibold">
            <span className={buy ? 'text-up' : 'text-down'}>{buy ? 'Buy' : 'Sell'}</span> {signal.symbol}
            {quote && quote.broker_symbol !== signal.symbol && <span className="font-normal text-muted"> ({quote.broker_symbol})</span>}
            <span className="font-normal text-muted"> · market order</span>
          </h2>
          <button onClick={onClose} className="rounded-[3px] p-1 text-muted hover:bg-raised hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          {!demo && <Notice tone="warn">Live account. This order uses real money.</Notice>}
          {rows.length > 0 && <KV rows={rows} />}
          {step.kind === 'loading' && <p className="text-xs text-muted">Checking the live price and sizing the position…</p>}
          {step.kind === 'blocked' && (
            <Notice tone="down">
              <p className="mb-1 font-semibold">Order blocked</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {step.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Notice>
          )}
          {step.kind === 'error' && <Notice tone="down">{step.message}</Notice>}
          {step.kind === 'done' && (
            <Notice tone="up">
              Filled {step.result.lots} lots at {fmt(step.result.price)} · ticket #{step.result.ticket}
            </Notice>
          )}
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3">
          <button onClick={onClose} className={`${btn.base} ${btn.secondary} flex-1`}>
            {step.kind === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step.kind !== 'done' && (
            <button onClick={confirm} disabled={step.kind !== 'ready'} className={`${btn.base} ${buy ? btn.buy : btn.sell} flex-1`}>
              {step.kind === 'sending' ? 'Sending…' : preview ? `${buy ? 'Buy' : 'Sell'} ${preview.lots} lots` : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
