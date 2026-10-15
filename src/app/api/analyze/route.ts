import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { marketSnapshot } from '@/lib/analysis';
import { AnalyzeRequestSchema, type AnalyzeEvent } from '@/lib/chat';
import { getCandles } from '@/lib/market';
import { SignalInputSchema, SUBMIT_SIGNAL_INPUT_SCHEMA } from '@/lib/signal';

export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

const SYSTEM_PROMPT = `You are the analyst inside a personal trading terminal. The user trades forex, gold, crypto and index CFDs intraday (holding from minutes to a few hours) and thinks in ICT / smart-money concepts: market structure (BOS, CHoCH), liquidity sweeps, order blocks, fair value gaps, premium and discount.

Each user message arrives with a market snapshot: recent OHLC bars plus derived levels. Ground every price you mention in that data rather than in prices you remember, since your memory of markets is out of date.

Reply with a short analysis in plain text: a few sentences or "-" bullets, no headings or tables.

When the user asks for analysis, a bias, or a setup, finish by calling submit_signal once. Use no_trade (with null prices) when structure is unclear, the stop would have to be unreasonably wide, or reward is under 1.5x the risk. Trades are executed at market, so place the stop loss and take profit relative to the current price: for a buy, the stop below it and the target above it; for a sell, the reverse. Use the same price scale as the snapshot. For other questions, just answer without calling the tool.`;

const tools = [
  {
    name: 'submit_signal',
    description: 'Submit the trade call for the current symbol so the terminal can plot it and offer execution.',
    input_schema: SUBMIT_SIGNAL_INPUT_SCHEMA,
    strict: true,
    eager_input_streaming: true,
  },
] as Anthropic.Beta.BetaTool[];

// Best-effort per-instance limit; the site is also behind a password (src/proxy.ts).
const recent: number[] = [];
function rateLimited(): boolean {
  const now = Date.now();
  while (recent.length && now - recent[0]! > 60_000) recent.shift();
  if (recent.length >= 10) return true;
  recent.push(now);
  return false;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 500 });
  }
  if (rateLimited()) {
    return NextResponse.json({ error: 'Too many analysis requests. Wait a minute.' }, { status: 429 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { symbol, timeframe, messages } = parsed.data;
  if (messages[0]?.role !== 'user' || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'Conversation must start and end with a user message' }, { status: 400 });
  }

  let candles;
  try {
    candles = await getCandles(symbol, timeframe);
  } catch {
    return NextResponse.json({ error: 'Market data feed unavailable, so there is nothing to analyse. Try again shortly.' }, { status: 502 });
  }
  const feedPrice = candles[candles.length - 1]!.close;

  // Earlier turns go as plain text; the latest question carries the fresh snapshot.
  const history: Anthropic.Beta.BetaMessageParam[] = messages.map((m, i) =>
    i === messages.length - 1
      ? { role: 'user', content: [{ type: 'text', text: marketSnapshot(symbol, timeframe, candles) }, { type: 'text', text: m.content }] }
      : { role: m.role, content: m.content },
  );

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AnalyzeEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      try {
        const stream = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 64000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'high' },
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            tools,
            messages: history,
          },
          { signal: req.signal },
        );
        stream.on('text', (text) => send({ type: 'text', text }));

        const message = await stream.finalMessage();
        if (message.stop_reason === 'refusal') {
          send({ type: 'error', message: 'The model declined to answer this request.' });
        } else {
          const call = message.content.find((b) => b.type === 'tool_use' && b.name === 'submit_signal');
          if (call && call.type === 'tool_use') {
            if (message.stop_reason === 'max_tokens') {
              send({ type: 'error', message: 'The signal was cut off before it finished. Ask again.' });
            } else {
              const signal = SignalInputSchema.safeParse(call.input);
              if (signal.success) send({ type: 'signal', signal: signal.data, feedPrice });
              else send({ type: 'error', message: `The model's signal was rejected: ${signal.error.issues.map((i) => i.message).join('; ')}` });
            }
          }
        }
      } catch (err) {
        if (req.signal.aborted) return controller.close();
        console.error('analyze', err);
        let message = 'Analysis failed. Try again.';
        if (err instanceof Anthropic.AuthenticationError) message = 'The server’s Anthropic API key was rejected.';
        else if (err instanceof Anthropic.RateLimitError) message = 'Anthropic rate limit reached. Wait a moment and retry.';
        else if (err instanceof Anthropic.APIError) message = `Anthropic API error (${err.status ?? 'network'}). Try again.`;
        // With eager input streaming, unparseable tool JSON surfaces as a base AnthropicError.
        else if (err instanceof Anthropic.AnthropicError) message = 'The model returned a malformed signal. Ask again.';
        send({ type: 'error', message });
      }
      send({ type: 'done' });
      controller.close();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
