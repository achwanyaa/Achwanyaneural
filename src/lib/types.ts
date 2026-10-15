export const SYMBOL_IDS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'NAS100', 'US30'] as const;
export type SymbolId = (typeof SYMBOL_IDS)[number];

export const TIMEFRAMES = ['5M', '15M', '30M', '1H', '4H', '1D'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** One OHLC bar. `time` is the bar open as a UTC unix timestamp in seconds. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: SymbolId;
  price: number;
  /** Percent change vs. the previous session close. */
  changePct: number | null;
  /** Unix seconds of the last update. */
  time: number;
}

export function isSymbolId(value: unknown): value is SymbolId {
  return typeof value === 'string' && (SYMBOL_IDS as readonly string[]).includes(value);
}

export function isTimeframe(value: unknown): value is Timeframe {
  return typeof value === 'string' && (TIMEFRAMES as readonly string[]).includes(value);
}
