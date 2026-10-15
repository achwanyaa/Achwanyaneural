import type { SymbolId, Timeframe } from './types';

export const TIMEFRAME_LABEL: Record<Timeframe, string> = { '5M': '5m', '15M': '15m', '30M': '30m', '1H': '1h', '4H': '4h', '1D': '1D' };

export interface SymbolSpec {
  id: SymbolId;
  label: string;
  /** Decimal places for display. */
  digits: number;
  /** Where chart/quote data comes from, and that feed's ticker. */
  feed: { provider: 'yahoo'; ticker: string } | { provider: 'binance'; ticker: string };
  /** Shown next to the price so it's clear the chart may differ from the broker's CFD price. */
  feedNote: string;
}

export const SYMBOLS: Record<SymbolId, SymbolSpec> = {
  XAUUSD: {
    id: 'XAUUSD',
    label: 'Gold',
    digits: 2,
    feed: { provider: 'yahoo', ticker: 'GC=F' },
    feedNote: 'COMEX gold futures — typically trades a few dollars above spot',
  },
  EURUSD: {
    id: 'EURUSD',
    label: 'EUR/USD',
    digits: 5,
    feed: { provider: 'yahoo', ticker: 'EURUSD=X' },
    feedNote: 'Spot FX',
  },
  GBPUSD: {
    id: 'GBPUSD',
    label: 'GBP/USD',
    digits: 5,
    feed: { provider: 'yahoo', ticker: 'GBPUSD=X' },
    feedNote: 'Spot FX',
  },
  USDJPY: {
    id: 'USDJPY',
    label: 'USD/JPY',
    digits: 3,
    feed: { provider: 'yahoo', ticker: 'JPY=X' },
    feedNote: 'Spot FX',
  },
  BTCUSD: {
    id: 'BTCUSD',
    label: 'Bitcoin',
    digits: 2,
    feed: { provider: 'binance', ticker: 'BTCUSDT' },
    feedNote: 'Binance BTC/USDT',
  },
  NAS100: {
    id: 'NAS100',
    label: 'Nasdaq 100',
    digits: 2,
    feed: { provider: 'yahoo', ticker: 'NQ=F' },
    feedNote: 'CME E-mini Nasdaq futures — differs from cash index/CFD',
  },
  US30: {
    id: 'US30',
    label: 'Dow 30',
    digits: 1,
    feed: { provider: 'yahoo', ticker: 'YM=F' },
    feedNote: 'CBOT E-mini Dow futures — differs from cash index/CFD',
  },
};

export function formatPrice(symbol: SymbolId, price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return '—';
  const { digits } = SYMBOLS[symbol];
  return price.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
