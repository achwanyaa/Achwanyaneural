import { SYMBOLS } from './symbols';
import type { Candle, SymbolId, Timeframe } from './types';

/** Average true range over the last `period` bars. */
export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i]!, prev = candles[i - 1]!;
    sum += Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  }
  return sum / period;
}

/** Fractal swing points: a bar whose high (low) is the extreme of `wing` bars either side. */
export function swingPoints(candles: Candle[], wing = 2): { highs: Candle[]; lows: Candle[] } {
  const highs: Candle[] = [], lows: Candle[] = [];
  for (let i = wing; i < candles.length - wing; i++) {
    const c = candles[i]!;
    let isHigh = true, isLow = true;
    for (let j = i - wing; j <= i + wing; j++) {
      if (j === i) continue;
      if (candles[j]!.high >= c.high) isHigh = false;
      if (candles[j]!.low <= c.low) isLow = false;
    }
    if (isHigh) highs.push(c);
    if (isLow) lows.push(c);
  }
  return { highs, lows };
}

const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ');

/**
 * Compact text snapshot of the market sent alongside each question. Kept deterministic
 * (no wall-clock time) apart from the data itself.
 */
export function marketSnapshot(symbol: SymbolId, tf: Timeframe, candles: Candle[], bars = 120): string {
  const spec = SYMBOLS[symbol];
  const d = spec.digits;
  const recent = candles.slice(-bars);
  const last = recent[recent.length - 1];
  if (!last) return `No market data available for ${symbol} ${tf}.`;
  const f = (n: number) => n.toFixed(d);
  const range = atr(candles);
  const { highs, lows } = swingPoints(recent);
  const hi = Math.max(...recent.map((c) => c.high));
  const lo = Math.min(...recent.map((c) => c.low));

  const lines = [
    `Market snapshot for ${symbol} (${spec.label}), timeframe ${tf}.`,
    `Data source: ${spec.feedNote}. Prices may be delayed up to ~15 minutes and can differ from the broker's quote.`,
    `Last price: ${f(last.close)} (bar opened ${iso(last.time)} UTC; the last bar may still be forming).`,
    `Range of the ${recent.length} bars below: high ${f(hi)}, low ${f(lo)}.`,
  ];
  if (range != null) lines.push(`ATR(14): ${f(range)}.`);
  lines.push(
    `Recent swing highs: ${highs.slice(-5).map((c) => `${f(c.high)} @ ${iso(c.time)}`).join(', ') || 'none'}.`,
    `Recent swing lows: ${lows.slice(-5).map((c) => `${f(c.low)} @ ${iso(c.time)}`).join(', ') || 'none'}.`,
    '',
    'OHLC bars, oldest first (time UTC, open, high, low, close):',
    ...recent.map((c) => `${iso(c.time)},${f(c.open)},${f(c.high)},${f(c.low)},${f(c.close)}`),
  );
  return lines.join('\n');
}
