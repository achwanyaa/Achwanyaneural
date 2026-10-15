import { describe, expect, it } from 'vitest';
import { applyBasisOffset, executionProblems, riskReward, SignalInputSchema, type TradeSignal } from './signal';

const base: TradeSignal = {
  id: 's1',
  symbol: 'XAUUSD',
  timeframe: '15M',
  side: 'buy',
  confidence: 70,
  entry: 2400,
  stopLoss: 2390,
  takeProfit: 2425,
  reasoning: 'test',
  feedPrice: 2400,
  createdAt: 1_000_000,
};
const now = base.createdAt + 60_000;

describe('SignalInputSchema', () => {
  it('accepts a valid buy and a no_trade with nulls', () => {
    expect(SignalInputSchema.safeParse({ direction: 'buy', confidence: 70, entry: 10, stop_loss: 9, take_profit: 12, reasoning: 'x' }).success).toBe(true);
    expect(SignalInputSchema.safeParse({ direction: 'no_trade', confidence: 20, entry: null, stop_loss: null, take_profit: null, reasoning: 'x' }).success).toBe(true);
  });

  it('rejects stops on the wrong side', () => {
    expect(SignalInputSchema.safeParse({ direction: 'buy', confidence: 70, entry: 10, stop_loss: 11, take_profit: 12, reasoning: 'x' }).success).toBe(false);
    expect(SignalInputSchema.safeParse({ direction: 'sell', confidence: 70, entry: 10, stop_loss: 9, take_profit: 8, reasoning: 'x' }).success).toBe(false);
  });

  it('rejects buy/sell without levels and string numbers', () => {
    expect(SignalInputSchema.safeParse({ direction: 'sell', confidence: 70, entry: null, stop_loss: 11, take_profit: 8, reasoning: 'x' }).success).toBe(false);
    expect(SignalInputSchema.safeParse({ direction: 'buy', confidence: 70, entry: '10', stop_loss: 9, take_profit: 12, reasoning: 'x' }).success).toBe(false);
  });
});

describe('riskReward / applyBasisOffset', () => {
  it('computes R:R', () => {
    expect(riskReward(base)).toBe(2.5);
  });

  it('shifts all levels and preserves distances', () => {
    const s = applyBasisOffset(base, -18.5);
    expect([s.entry, s.stopLoss, s.takeProfit]).toEqual([2381.5, 2371.5, 2406.5]);
    expect(riskReward(s)).toBeCloseTo(2.5);
  });
});

describe('executionProblems', () => {
  it('passes a fresh signal at entry', () => {
    expect(executionProblems(base, 2400, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now })).toEqual([]);
  });

  it('blocks stale signals', () => {
    const p = executionProblems(base, 2400, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now: base.createdAt + 45 * 60_000 });
    expect(p.join(' ')).toMatch(/45 min old/);
  });

  it('blocks when the live price is already past the stop', () => {
    const p = executionProblems(base, 2388, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now });
    expect(p.join(' ')).toMatch(/stop loss must be below/);
  });

  it('blocks large drift from entry', () => {
    const p = executionProblems(base, 2407, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now });
    expect(p.join(' ')).toMatch(/moved 70%/);
  });

  it('blocks poor live risk:reward', () => {
    const p = executionProblems(base, 2404, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 2, now });
    expect(p.join(' ')).toMatch(/Risk:reward at the current price/);
  });

  it('validates sells mirror-image', () => {
    const sell: TradeSignal = { ...base, side: 'sell', stopLoss: 2410, takeProfit: 2375 };
    expect(executionProblems(sell, 2400, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now })).toEqual([]);
    expect(executionProblems(sell, 2412, { maxAgeMs: 30 * 60_000, maxDriftOfStop: 0.5, minRiskReward: 1, now }).length).toBeGreaterThan(0);
  });
});
