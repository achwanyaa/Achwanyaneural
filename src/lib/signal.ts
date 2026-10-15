import { z } from 'zod';
import type { SymbolId, Timeframe } from './types';

/** What the model returns through the submit_signal tool. */
export const SignalInputSchema = z
  .object({
    direction: z.enum(['buy', 'sell', 'no_trade']),
    confidence: z.number().int().min(0).max(100),
    entry: z.number().positive().nullable(),
    stop_loss: z.number().positive().nullable(),
    take_profit: z.number().positive().nullable(),
    reasoning: z.string().min(1).max(600),
  })
  .superRefine((s, ctx) => {
    if (s.direction === 'no_trade') return;
    if (s.entry == null || s.stop_loss == null || s.take_profit == null) {
      ctx.addIssue({ code: 'custom', message: 'buy/sell signals need entry, stop_loss and take_profit' });
      return;
    }
    const problem = levelsProblem(s.direction, s.entry, s.stop_loss, s.take_profit);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  });

export type SignalInput = z.infer<typeof SignalInputSchema>;

export type Side = 'buy' | 'sell';

export interface TradeSignal {
  id: string;
  symbol: SymbolId;
  timeframe: Timeframe;
  side: Side;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  /** Last feed price when the signal was produced. */
  feedPrice: number;
  /** Unix ms. */
  createdAt: number;
}

/** JSON Schema for the tool definition (strict tool use requires additionalProperties: false). */
export const SUBMIT_SIGNAL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    direction: { type: 'string', enum: ['buy', 'sell', 'no_trade'], description: 'Trade direction, or no_trade when there is no clear setup.' },
    confidence: { type: 'integer', description: 'Confidence in the setup, 0-100.' },
    entry: { type: ['number', 'null'], description: 'Entry price in chart prices; null for no_trade.' },
    stop_loss: { type: ['number', 'null'], description: 'Stop-loss price; below entry for buy, above entry for sell. Null for no_trade.' },
    take_profit: { type: ['number', 'null'], description: 'Take-profit price; above entry for buy, below entry for sell. Null for no_trade.' },
    reasoning: { type: 'string', description: 'One or two sentences naming the structure and levels behind the call.' },
  },
  required: ['direction', 'confidence', 'entry', 'stop_loss', 'take_profit', 'reasoning'],
  additionalProperties: false,
} as const;

export function levelsProblem(side: Side, entry: number, sl: number, tp: number): string | null {
  if (side === 'buy' && !(sl < entry && tp > entry)) return 'For a buy, stop loss must be below entry and take profit above it';
  if (side === 'sell' && !(sl > entry && tp < entry)) return 'For a sell, stop loss must be above entry and take profit below it';
  return null;
}

export function riskReward(s: Pick<TradeSignal, 'entry' | 'stopLoss' | 'takeProfit'>): number {
  const risk = Math.abs(s.entry - s.stopLoss);
  return risk === 0 ? 0 : Math.abs(s.takeProfit - s.entry) / risk;
}

/**
 * Chart data comes from a free feed (e.g. gold futures) while orders execute at the broker's
 * CFD price. Shift the signal by the measured gap so distances (risk, reward) are preserved.
 */
export function applyBasisOffset(s: TradeSignal, offset: number): TradeSignal {
  return { ...s, entry: s.entry + offset, stopLoss: s.stopLoss + offset, takeProfit: s.takeProfit + offset };
}

export interface ExecutionCheckOptions {
  /** Reject signals older than this. */
  maxAgeMs: number;
  /** Max distance the live price may have moved from entry, as a fraction of the stop distance. */
  maxDriftOfStop: number;
  minRiskReward: number;
  now?: number;
}

export const DEFAULT_EXECUTION_CHECKS: ExecutionCheckOptions = {
  maxAgeMs: 30 * 60_000,
  maxDriftOfStop: 0.5,
  minRiskReward: 1,
};

/**
 * Checks run right before an order is sent, against the broker's live price.
 * `signal` must already be basis-adjusted; `livePrice` is ask for buys, bid for sells.
 * Returns human-readable problems; empty means OK to send.
 */
export function executionProblems(signal: TradeSignal, livePrice: number, opts: ExecutionCheckOptions = DEFAULT_EXECUTION_CHECKS): string[] {
  const problems: string[] = [];
  const now = opts.now ?? Date.now();
  const ageMin = (now - signal.createdAt) / 60_000;
  if (now - signal.createdAt > opts.maxAgeMs) {
    problems.push(`Signal is ${Math.round(ageMin)} min old (max ${Math.round(opts.maxAgeMs / 60_000)}). Ask for a fresh analysis.`);
  }
  // Orders fill at the live price, so SL/TP must be valid relative to it, not just to the planned entry.
  const live = levelsProblem(signal.side, livePrice, signal.stopLoss, signal.takeProfit);
  if (live) problems.push(`${live} at the current price ${livePrice}.`);
  const stopDist = Math.abs(signal.entry - signal.stopLoss);
  const drift = Math.abs(livePrice - signal.entry);
  if (stopDist > 0 && drift / stopDist > opts.maxDriftOfStop) {
    problems.push(`Price has moved ${Math.round((drift / stopDist) * 100)}% of the stop distance away from entry.`);
  }
  const liveRR = riskReward({ entry: livePrice, stopLoss: signal.stopLoss, takeProfit: signal.takeProfit });
  if (!live && liveRR < opts.minRiskReward) {
    problems.push(`Risk:reward at the current price is 1:${liveRR.toFixed(2)} (minimum 1:${opts.minRiskReward}).`);
  }
  return problems;
}
