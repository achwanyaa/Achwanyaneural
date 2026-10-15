'use client';

import { useEffect, useState } from 'react';
import type { Candle, Quote, SymbolId, Timeframe } from '@/lib/types';

const CANDLE_POLL_MS = 30_000;
const QUOTE_POLL_MS = 60_000;

interface CandleState {
  key: string;
  candles: Candle[];
  error: string | null;
  updatedAt: number | null;
}

/** Candles for one symbol/timeframe, refreshed every 30 s. Data for a previous key is never shown. */
export function useCandles(symbol: SymbolId, tf: Timeframe) {
  const key = `${symbol}:${tf}`;
  const [state, setState] = useState<CandleState>({ key, candles: [], error: null, updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`/api/candles?symbol=${symbol}&tf=${tf}`, { signal: controller.signal, cache: 'no-store' });
        const body = (await res.json()) as { candles?: Candle[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !body.candles) throw new Error(body.error ?? `HTTP ${res.status}`);
        setState({ key, candles: body.candles, error: null, updatedAt: Date.now() });
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setState((s) => ({ ...s, key, error: err instanceof Error ? err.message : 'Failed to load chart data' }));
      }
    }

    load();
    const timer = setInterval(load, CANDLE_POLL_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [key, symbol, tf]);

  const current = state.key === key;
  return {
    candles: current ? state.candles : [],
    error: current ? state.error : null,
    loading: !current || (!state.candles.length && !state.error),
    updatedAt: current ? state.updatedAt : null,
  };
}

/** Last price and daily change for every symbol, refreshed every minute. */
export function useQuotes() {
  const [quotes, setQuotes] = useState<Partial<Record<SymbolId, Quote>>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/quotes', { cache: 'no-store' });
        const body = (await res.json()) as { quotes: Quote[] };
        if (cancelled || !res.ok) return;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const q of body.quotes) next[q.symbol] = q;
          return next;
        });
      } catch {
        // keep the last known quotes; the watchlist shows them as-is
      }
    }
    load();
    const timer = setInterval(load, QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return quotes;
}
