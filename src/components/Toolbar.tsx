'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { formatPct, formatPrice, SYMBOLS, TIMEFRAME_LABEL } from '@/lib/symbols';
import type { ThemePref } from '@/lib/theme';
import { SYMBOL_IDS, TIMEFRAMES, type Quote, type SymbolId, type Timeframe } from '@/lib/types';

interface Props {
  symbol: SymbolId;
  onSymbol: (s: SymbolId) => void;
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  lastPrice: number | null;
  quote: Quote | undefined;
  bridgeOnline: boolean;
  bridgeDemo: boolean | null;
  onBridgeClick: () => void;
  themePref: ThemePref;
  onThemePref: (t: ThemePref) => void;
}

const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemePref, string> = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };

export default function Toolbar(p: Props) {
  const pct = p.quote?.changePct ?? null;
  const price = p.lastPrice;
  const abs = pct != null && price != null ? price - price / (1 + pct / 100) : null;
  const dir = pct == null ? 'text-muted' : pct >= 0 ? 'text-up' : 'text-down';
  const ThemeIcon = p.themePref === 'system' ? Monitor : p.themePref === 'light' ? Sun : Moon;

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-line bg-panel px-3 py-1.5 lg:h-11 lg:flex-nowrap lg:py-0">
      <span className="hidden select-none text-[13px] font-semibold tracking-tight lg:inline">
        Achwanya<span className="font-normal text-muted">Neural</span>
      </span>

      <div className="flex min-w-0 items-baseline gap-2.5">
        <select
          value={p.symbol}
          onChange={(e) => p.onSymbol(e.target.value as SymbolId)}
          className="rounded-[3px] border border-line bg-bg py-0.5 pl-1.5 pr-1 text-[13px] font-semibold lg:hidden"
          aria-label="Symbol"
        >
          {SYMBOL_IDS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="hidden text-[13px] font-semibold lg:inline">{p.symbol}</span>
        <span className="hidden text-xs text-muted xl:inline">{SYMBOLS[p.symbol].label}</span>
        <span className="num text-[15px] font-semibold">{formatPrice(p.symbol, price)}</span>
        <span className={`num text-xs ${dir}`}>
          {abs != null && `${abs >= 0 ? '+' : ''}${formatPrice(p.symbol, abs)} `}
          {formatPct(pct)}
        </span>
      </div>

      <nav className="order-last flex w-full overflow-x-auto lg:order-none lg:w-auto" aria-label="Timeframe">
        <div className="flex rounded-[3px] border border-line">
          {TIMEFRAMES.map((tf, i) => (
            <button
              key={tf}
              onClick={() => p.onTimeframe(tf)}
              aria-pressed={tf === p.timeframe}
              className={`num shrink-0 px-2.5 py-[3px] text-xs ${i > 0 ? 'border-l border-line' : ''} ${
                tf === p.timeframe ? 'bg-raised font-semibold text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {TIMEFRAME_LABEL[tf]}
            </button>
          ))}
        </div>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={p.onBridgeClick} className="flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-xs text-muted hover:bg-raised hover:text-ink">
          <span className={`size-1.5 rounded-full ${p.bridgeOnline ? (p.bridgeDemo ? 'bg-up' : 'bg-warn') : 'bg-faint'}`} />
          {p.bridgeOnline ? (p.bridgeDemo ? 'MT5 demo' : 'MT5 live') : 'MT5 offline'}
        </button>
        <button
          onClick={() => p.onThemePref(NEXT_THEME[p.themePref])}
          className="rounded-[3px] p-1.5 text-muted hover:bg-raised hover:text-ink"
          title={THEME_LABEL[p.themePref]}
          aria-label={THEME_LABEL[p.themePref]}
        >
          <ThemeIcon className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
