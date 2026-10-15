import type { Side } from './signal';
import type { SymbolId } from './types';

/** Client for the local MT5 bridge (bridge/mt5_bridge.py). Runs in the browser. */

export interface BridgeSettings {
  url: string;
  token: string;
  /** Percent of balance risked per trade. */
  riskPct: number;
}

export const DEFAULT_BRIDGE_SETTINGS: BridgeSettings = { url: 'http://127.0.0.1:18765', token: '', riskPct: 0.5 };

export interface BridgeStatus {
  connected: boolean;
  trade_allowed: boolean;
  account: { login: number; server: string; currency: string; balance: number; equity: number; demo: boolean };
  max_risk_pct: number;
}

export interface BridgeQuote {
  symbol: string;
  broker_symbol: string;
  bid: number;
  ask: number;
  digits: number;
  time: number;
}

export interface TradePreview {
  broker_symbol: string;
  price: number;
  lots: number;
  risk_money: number;
  reward_money: number;
  currency: string;
  digits: number;
}

export interface TradeResult {
  ticket: number;
  deal: number;
  price: number;
  lots: number;
}

export interface Position {
  ticket: number;
  symbol: string;
  broker_symbol: string;
  side: Side;
  lots: number;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  profit: number;
  time: number;
}

export class BridgeError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
  }
}

async function call<T>(s: BridgeSettings, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${s.url.replace(/\/+$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-Bridge-Token': s.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new BridgeError('Bridge unreachable. Is mt5_bridge.py running, and is this site in its allowed_origins?', null);
  }
  const data = (await res.json().catch(() => null)) as ({ detail?: unknown } & T) | null;
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : `Bridge error ${res.status}`;
    throw new BridgeError(detail, res.status);
  }
  return data as T;
}

export const bridge = {
  status: (s: BridgeSettings) => call<BridgeStatus>(s, '/status'),
  quote: (s: BridgeSettings, symbol: SymbolId) => call<BridgeQuote>(s, `/quote/${symbol}`),
  preview: (s: BridgeSettings, req: { symbol: SymbolId; side: Side; sl: number; tp: number; risk_pct: number }) =>
    call<TradePreview>(s, '/preview', req),
  trade: (s: BridgeSettings, req: { symbol: SymbolId; side: Side; sl: number; tp: number; lots: number }) =>
    call<TradeResult>(s, '/trade', req),
  positions: (s: BridgeSettings) => call<{ positions: Position[] }>(s, '/positions').then((r) => r.positions),
  close: (s: BridgeSettings, ticket: number) => call<{ closed: number; price: number }>(s, `/close/${ticket}`, {}),
};
