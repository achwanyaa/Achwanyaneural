'use client';

import { useState } from 'react';
import { BridgeError, type Position } from '@/lib/bridge';
import { Empty, Notice } from './ui';

interface Props {
  positions: Position[];
  online: boolean;
  currency: string | undefined;
  onClosePosition: (ticket: number) => Promise<void>;
}

const money = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

export default function Positions({ positions, online, currency, onClosePosition }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [closing, setClosing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!online) return <Empty title="MT5 not connected" hint="Connect the bridge to see open positions." />;
  if (!positions.length) return <Empty title="No open positions" hint="Only positions opened from this terminal are listed." />;

  async function close(ticket: number) {
    setClosing(ticket);
    setError(null);
    try {
      await onClosePosition(ticket);
    } catch (err) {
      setError(err instanceof BridgeError ? err.message : 'Close failed');
    } finally {
      setClosing(null);
      setConfirming(null);
    }
  }

  const total = positions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex h-8 items-center justify-between border-b border-line px-3 text-xs">
        <span className="text-muted">{positions.length} open</span>
        <span className={`num font-medium ${total >= 0 ? 'text-up' : 'text-down'}`}>
          {money(total)} {currency}
        </span>
      </div>
      {error && (
        <div className="p-3">
          <Notice tone="down">{error}</Notice>
        </div>
      )}
      {positions.map((p) => (
        <div key={p.ticket} className="border-b border-line px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px]">
              <span className={`font-semibold ${p.side === 'buy' ? 'text-up' : 'text-down'}`}>{p.side === 'buy' ? 'Buy' : 'Sell'}</span>{' '}
              <span className="font-medium">{p.symbol}</span> <span className="num text-muted">{p.lots}</span>
            </span>
            <span className={`num text-[13px] font-medium ${p.profit >= 0 ? 'text-up' : 'text-down'}`}>{money(p.profit)}</span>
          </div>
          <div className="num mt-0.5 flex justify-between text-xs text-muted">
            <span>
              {p.open_price} → {p.current_price}
            </span>
            <span>
              SL {p.sl || '—'} · TP {p.tp || '—'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="num text-faint">#{p.ticket}</span>
            {confirming === p.ticket ? (
              <span className="flex gap-3">
                <button onClick={() => setConfirming(null)} className="text-muted hover:text-ink">
                  Keep open
                </button>
                <button onClick={() => close(p.ticket)} disabled={closing === p.ticket} className="font-semibold text-down disabled:opacity-50">
                  {closing === p.ticket ? 'Closing…' : 'Close at market'}
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirming(p.ticket)} className="text-muted hover:text-down">
                Close
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
