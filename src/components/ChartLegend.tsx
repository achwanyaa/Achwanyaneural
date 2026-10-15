'use client';

import { formatPrice, SYMBOLS, TIMEFRAME_LABEL } from '@/lib/symbols';
import type { Candle, SymbolId, Timeframe } from '@/lib/types';

/** TradingView-style legend: instrument and the latest bar's OHLC. */
export default function ChartLegend({ symbol, timeframe, candles }: { symbol: SymbolId; timeframe: Timeframe; candles: Candle[] }) {
  const last = candles[candles.length - 1];
  const dir = last ? (last.close >= last.open ? 'text-up' : 'text-down') : 'text-muted';
  const field = (label: string, value: number | undefined) => (
    <span className="whitespace-nowrap">
      <span className="text-faint">{label}</span> <span className={`num ${dir}`}>{formatPrice(symbol, value)}</span>
    </span>
  );
  return (
    <div className="flex h-8 items-center gap-4 border-b border-line px-3 text-xs">
      <span className="shrink-0 whitespace-nowrap">
        <span className="font-semibold">{symbol}</span>
        <span className="text-muted"> · {TIMEFRAME_LABEL[timeframe]}</span>
      </span>
      <span className="hidden shrink-0 gap-3 sm:flex">
        {field('O', last?.open)}
        {field('H', last?.high)}
        {field('L', last?.low)}
        {field('C', last?.close)}
      </span>
      <span className="ml-auto hidden min-w-0 truncate text-faint xl:inline" title={SYMBOLS[symbol].feedNote}>
        {SYMBOLS[symbol].feedNote}
      </span>
    </div>
  );
}
