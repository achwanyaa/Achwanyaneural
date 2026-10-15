import { describe, expect, it } from 'vitest';
import { atr, marketSnapshot, swingPoints } from './analysis';
import { toModelHistory } from './chat';
import { formatPct, formatPrice } from './symbols';
import type { Candle } from './types';

describe('formatPrice', () => {
  it('uses per-symbol digits', () => {
    expect(formatPrice('EURUSD', 1.08251)).toBe('1.08251');
    expect(formatPrice('XAUUSD', 2400.5)).toBe('2,400.50');
    expect(formatPrice('USDJPY', 151.2)).toBe('151.200');
    expect(formatPrice('EURUSD', null)).toBe('—');
    expect(formatPct(0.4231)).toBe('+0.42%');
  });
});

describe('toModelHistory', () => {
  it('drops errors and leading assistant turns, merges same-role turns', () => {
    const h = toModelHistory([
      { role: 'assistant', content: 'welcome' },
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'oops', error: true },
      { role: 'user', content: 'b' },
    ]);
    expect(h).toEqual([{ role: 'user', content: 'a\n\nb' }]);
  });

  it('returns null without a trailing user turn', () => {
    expect(toModelHistory([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'x' }])).toBeNull();
  });
});

describe('analysis helpers', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => {
    const mid = 100 + Math.sin(i / 3) * 5;
    return { time: i * 900, open: mid, high: mid + 1, low: mid - 1, close: mid + 0.2, volume: 1 };
  });

  it('atr is positive and null when too short', () => {
    expect(atr(candles)).toBeGreaterThan(0);
    expect(atr(candles.slice(0, 5))).toBeNull();
  });

  it('finds swing highs and lows', () => {
    const { highs, lows } = swingPoints(candles);
    expect(highs.length).toBeGreaterThan(0);
    expect(lows.length).toBeGreaterThan(0);
  });

  it('snapshot includes last price and bars', () => {
    const s = marketSnapshot('XAUUSD', '15M', candles);
    expect(s).toContain('Last price: ');
    expect(s.split('\n').filter((l) => /^\d{4}-\d{2}-\d{2} /.test(l))).toHaveLength(30);
  });
});
