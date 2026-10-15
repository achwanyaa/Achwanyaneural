import type { Candle, Timeframe } from '../types';

// Binance's public market-data mirror: keyless, and not geo-blocked for US servers
// (api.binance.com returns 451 from US regions such as Vercel's iad1).
const BASE = 'https://data-api.binance.vision/api/v3';

const INTERVALS: Record<Timeframe, string> = {
  '5M': '5m',
  '15M': '15m',
  '30M': '30m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
};

type Kline = [number, string, string, string, string, string, ...unknown[]];

export function parseBinanceKlines(rows: Kline[]): Candle[] {
  return rows.map(([openMs, o, h, l, c, v]) => ({
    time: Math.floor(openMs / 1000),
    open: Number(o),
    high: Number(h),
    low: Number(l),
    close: Number(c),
    volume: Number(v),
  }));
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function getBinanceCandles(ticker: string, tf: Timeframe): Promise<Candle[]> {
  return parseBinanceKlines(await getJson<Kline[]>(`/klines?symbol=${ticker}&interval=${INTERVALS[tf]}&limit=500`));
}

export async function getBinanceQuote(ticker: string): Promise<{ price: number; changePct: number | null; time: number }> {
  const t = await getJson<{ lastPrice: string; priceChangePercent: string; closeTime: number }>(`/ticker/24hr?symbol=${ticker}`);
  return { price: Number(t.lastPrice), changePct: Number(t.priceChangePercent), time: Math.floor(t.closeTime / 1000) };
}
