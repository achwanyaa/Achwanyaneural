import 'server-only';
import { SYMBOLS } from '../symbols';
import type { Candle, Quote, SymbolId, Timeframe } from '../types';
import { getBinanceCandles, getBinanceQuote } from './binance';
import { getYahooCandles, getYahooQuote } from './yahoo';

const MAX_BARS = 300;
const CANDLE_TTL_MS = 20_000;
const QUOTE_TTL_MS = 30_000;
/** Never serve data older than this, even if refreshes keep failing. */
const MAX_STALE_MS = 5 * 60_000;

// Per-instance stale-while-revalidate cache, so polling clients don't hammer free feeds and
// a slow upstream (Yahoo can take several seconds) only delays the very first load.
// On serverless this lives as long as the warm instance.
interface Entry {
  value?: unknown;
  fetchedAt: number;
  freshUntil: number;
  inflight?: Promise<unknown>;
}
const cache = new Map<string, Entry>();

function swr<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) ?? { fetchedAt: 0, freshUntil: 0 };
  cache.set(key, entry);
  if (entry.value !== undefined && Date.now() - entry.fetchedAt > MAX_STALE_MS) entry.value = undefined;
  if (entry.value !== undefined && entry.freshUntil > Date.now()) return Promise.resolve(entry.value as T);
  if (!entry.inflight) {
    entry.inflight = load()
      .then((value) => {
        entry.value = value;
        entry.fetchedAt = Date.now();
        entry.freshUntil = entry.fetchedAt + ttlMs;
        return value;
      })
      .finally(() => {
        entry.inflight = undefined;
      });
    entry.inflight.catch(() => {}); // a failed background refresh keeps serving the stale value
  }
  return entry.value !== undefined ? Promise.resolve(entry.value as T) : (entry.inflight as Promise<T>);
}

export function getCandles(symbol: SymbolId, tf: Timeframe): Promise<Candle[]> {
  return swr(`c:${symbol}:${tf}`, CANDLE_TTL_MS, async () => {
    const { feed } = SYMBOLS[symbol];
    const candles = feed.provider === 'binance' ? await getBinanceCandles(feed.ticker, tf) : await getYahooCandles(feed.ticker, tf);
    if (!candles.length) throw new Error(`No candles for ${symbol} ${tf}`);
    return candles.slice(-MAX_BARS);
  });
}

export function getQuote(symbol: SymbolId): Promise<Quote> {
  return swr(`q:${symbol}`, QUOTE_TTL_MS, async () => {
    const { feed } = SYMBOLS[symbol];
    const q = feed.provider === 'binance' ? await getBinanceQuote(feed.ticker) : await getYahooQuote(feed.ticker);
    return { symbol, ...q };
  });
}
