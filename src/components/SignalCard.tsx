'use client';

import { riskReward, type TradeSignal } from '@/lib/signal';
import { formatPrice, TIMEFRAME_LABEL } from '@/lib/symbols';
import { btn, Empty, KV } from './ui';

interface Props {
  signal: TradeSignal | null;
  bridgeOnline: boolean;
  onExecute: () => void;
  onDismiss: () => void;
  onConnect: () => void;
}

function age(createdAt: number): string {
  const min = Math.round((Date.now() - createdAt) / 60_000);
  return min < 1 ? 'just now' : `${min} min ago`;
}

export default function SignalCard({ signal, bridgeOnline, onExecute, onDismiss, onConnect }: Props) {
  if (!signal) return <Empty title="No active signal" hint="Ask the analyst for a trade setup." />;

  const buy = signal.side === 'buy';
  return (
    <div className="h-full space-y-3 overflow-y-auto p-3">
      <div className="flex items-baseline justify-between">
        <h2 className={`text-[15px] font-semibold ${buy ? 'text-up' : 'text-down'}`}>
          {buy ? 'Buy' : 'Sell'} {signal.symbol}
        </h2>
        <span className="text-xs text-muted">
          {TIMEFRAME_LABEL[signal.timeframe]} · {age(signal.createdAt)}
        </span>
      </div>

      <KV
        rows={[
          { label: 'Entry', value: formatPrice(signal.symbol, signal.entry) },
          { label: 'Stop loss', value: formatPrice(signal.symbol, signal.stopLoss), cls: 'text-down' },
          { label: 'Take profit', value: formatPrice(signal.symbol, signal.takeProfit), cls: 'text-up' },
          { label: 'Reward : risk', value: `${riskReward(signal).toFixed(2)} : 1` },
          { label: 'Confidence', value: `${signal.confidence}%` },
        ]}
      />

      <p className="text-[13px] leading-relaxed">{signal.reasoning}</p>
      <p className="text-xs leading-relaxed text-faint">
        Levels are in chart-feed prices. Before an order is sent they&apos;re moved to your broker&apos;s live price and checked again.
      </p>

      <div className="flex gap-2 pt-1">
        {bridgeOnline ? (
          <button onClick={onExecute} className={`${btn.base} ${buy ? btn.buy : btn.sell} flex-1`}>
            Review {buy ? 'buy' : 'sell'} order
          </button>
        ) : (
          <button onClick={onConnect} className={`${btn.base} ${btn.secondary} flex-1`}>
            Connect MT5 to trade
          </button>
        )}
        <button onClick={onDismiss} className={`${btn.base} ${btn.ghost}`}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
