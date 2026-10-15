'use client';

import { formatPct, formatPrice, SYMBOLS } from '@/lib/symbols';
import { SYMBOL_IDS, type Quote, type SymbolId } from '@/lib/types';

interface Props {
  symbol: SymbolId;
  onSymbol: (s: SymbolId) => void;
  quotes: Partial<Record<SymbolId, Quote>>;
}

export default function Watchlist({ symbol, onSymbol, quotes }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center justify-between border-b border-line px-3 text-[11px] text-faint">
        <span>Symbol</span>
        <span className="flex gap-3">
          <span className="w-[72px] text-right">Last</span>
          <span className="w-[52px] text-right">Chg%</span>
        </span>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {SYMBOL_IDS.map((s) => {
          const q = quotes[s];
          const active = s === symbol;
          return (
            <li key={s}>
              <button
                onClick={() => onSymbol(s)}
                title={SYMBOLS[s].label}
                aria-current={active}
                className={`relative flex h-8 w-full items-center justify-between px-3 text-left ${active ? 'bg-raised' : 'hover:bg-raised/60'}`}
              >
                {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                <span className={`text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}>{s}</span>
                <span className="flex gap-3">
                  <span className="num w-[72px] text-right text-xs">{formatPrice(s, q?.price)}</span>
                  <span className={`num w-[52px] text-right text-xs ${q?.changePct == null ? 'text-faint' : q.changePct >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatPct(q?.changePct)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
