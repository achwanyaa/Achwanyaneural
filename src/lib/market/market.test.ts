import { describe, expect, it } from 'vitest';
import type { Candle } from '../types';
import { aggregateCandles } from './aggregate';
import { parseBinanceKlines } from './binance';
import { parseYahooCandles } from './yahoo';

const H = 3600;

describe('parseYahooCandles', () => {
  const chart = (timestamp: number[], o: (number | null)[], h: (number | null)[], l: (number | null)[], c: (number | null)[], v: (number | null)[]) => ({
    chart: { error: null, result: [{ meta: {}, timestamp, indicators: { quote: [{ open: o, high: h, low: l, close: c, volume: v }] } }] },
  });

  it('drops null bars and folds the live tick into the current bar', () => {
    // 5m bars at :25, :30 (null), :35, then a live tick stamped :35:13 (OHLC equal, volume 0)
    const t0 = 1_800_000_000 - (1_800_000_000 % 300);
    const json = chart(
      [t0, t0 + 300, t0 + 600, t0 + 613],
      [10, null, 12, 15],
      [11, null, 13, 15],
      [9, null, 11.5, 15],
      [10.5, null, 12.5, 15],
      [100, null, 50, 0],
    );
    const c = parseYahooCandles(json, 300);
    expect(c.map((x) => x.time)).toEqual([t0, t0 + 600]);
    expect(c[1]).toMatchObject({ open: 12, high: 15, low: 11.5, close: 15, volume: 50 });
  });

  it('keeps daily bars on their exchange-time grid', () => {
    const d = 86400, start = 4 * H; // bars at 04:00 UTC, live tick mid-day
    const c = parseYahooCandles(chart([start, start + d, start + d + 30_000], [1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 1, 0]), d);
    expect(c.map((x) => x.time)).toEqual([start, start + d]);
    expect(c[1]!.close).toBe(3);
  });

  it('throws on a Yahoo error payload', () => {
    expect(() => parseYahooCandles({ chart: { result: null, error: { code: 'Not Found', description: 'No data found' } } }, 300)).toThrow('No data found');
  });
});

describe('parseBinanceKlines', () => {
  it('converts ms and strings', () => {
    const [c] = parseBinanceKlines([[1_700_000_000_000, '1', '2', '0.5', '1.5', '100', 0]]);
    expect(c).toEqual({ time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 });
  });
});

describe('aggregateCandles', () => {
  it('merges 1h bars into UTC-aligned 4h bars', () => {
    const hourly: Candle[] = [0, 1, 2, 3, 4, 5].map((i) => ({ time: i * H, open: i, high: i + 1, low: i - 1, close: i + 0.5, volume: 1 }));
    const out = aggregateCandles(hourly, 4 * H);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ time: 0, open: 0, high: 4, low: -1, close: 3.5, volume: 4 });
    expect(out[1]).toEqual({ time: 4 * H, open: 4, high: 6, low: 3, close: 5.5, volume: 2 });
  });
});
