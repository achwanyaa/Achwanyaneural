import type { Candle, Timeframe } from '../types';
import { aggregateCandles } from './aggregate';

// Unofficial, keyless Yahoo Finance chart endpoint. It can change or rate-limit without
// notice — that's the trade-off for a free feed; swap the provider in symbols.ts if it breaks.
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

const PARAMS: Record<Timeframe, { interval: string; seconds: number; range: string; aggregateTo?: number }> = {
  '5M': { interval: '5m', seconds: 300, range: '5d' },
  '15M': { interval: '15m', seconds: 900, range: '1mo' },
  '30M': { interval: '30m', seconds: 1800, range: '1mo' },
  '1H': { interval: '60m', seconds: 3600, range: '3mo' },
  '4H': { interval: '60m', seconds: 3600, range: '6mo', aggregateTo: 4 * 3600 },
  '1D': { interval: '1d', seconds: 86400, range: '2y' },
};

interface YahooChartResponse {
  chart: {
    result:
      | {
          meta: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number };
          timestamp?: number[];
          indicators: {
            quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[];
          };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

async function fetchChart(ticker: string, interval: string, range: string): Promise<YahooChartResponse> {
  let lastError: unknown;
  for (const host of HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AchwanyaNeural/0.2)' },
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${ticker}`);
      return (await res.json()) as YahooChartResponse;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Yahoo request failed for ${ticker}`);
}

/**
 * Yahoo appends a live tick as an extra "bar" stamped with the current time (OHLC all equal,
 * volume 0). Snap each bar onto the previous bar's grid and fold anything that lands on an
 * existing bar into it, so the chart never shows a misplaced sliver bar.
 */
export function parseYahooCandles(json: YahooChartResponse, intervalSeconds: number): Candle[] {
  const result = json.chart.result?.[0];
  if (!result) throw new Error(json.chart.error?.description ?? 'Yahoo returned no data');
  const ts = result.timestamp ?? [];
  const q = result.indicators.quote[0];
  if (!q) return [];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const open = q.open[i], high = q.high[i], low = q.low[i], close = q.close[i];
    if (open == null || high == null || low == null || close == null) continue;
    const prev = out[out.length - 1];
    let time = ts[i]!;
    if (prev) time -= (((time - prev.time) % intervalSeconds) + intervalSeconds) % intervalSeconds;
    if (prev && time <= prev.time) {
      prev.high = Math.max(prev.high, high);
      prev.low = Math.min(prev.low, low);
      prev.close = close;
      prev.volume = Math.max(prev.volume, q.volume[i] ?? 0);
    } else {
      out.push({ time, open, high, low, close, volume: q.volume[i] ?? 0 });
    }
  }
  return out;
}

export async function getYahooCandles(ticker: string, tf: Timeframe): Promise<Candle[]> {
  const p = PARAMS[tf];
  const candles = parseYahooCandles(await fetchChart(ticker, p.interval, p.range), p.seconds);
  return p.aggregateTo ? aggregateCandles(candles, p.aggregateTo) : candles;
}

export async function getYahooQuote(ticker: string): Promise<{ price: number; changePct: number | null; time: number }> {
  const json = await fetchChart(ticker, '1d', '5d');
  const meta = json.chart.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`No Yahoo quote for ${ticker}`);
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  // For range=5d chartPreviousClose is 5 days back; use the prior daily close instead.
  const closes = (json.chart.result?.[0]?.indicators.quote[0]?.close ?? []).filter((c): c is number => c != null);
  const prevClose = closes.length >= 2 ? closes[closes.length - 2]! : prev;
  return {
    price: meta.regularMarketPrice,
    changePct: prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : null,
    time: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
  };
}
