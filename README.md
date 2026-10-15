# AchwanyaNeural

A personal trading terminal: real price charts, a Claude-powered analyst that proposes setups, and
one-click execution on MetaTrader 5 through a local bridge with built-in safety checks.

> Trading is risky. AI analysis can be wrong. Test on an MT5 **demo** account first, and check every level yourself.

## How it fits together

```
Browser (Next.js app)  ──/api/candles, /api/quotes──▶  Next.js server ──▶ free data feeds (Yahoo, Binance)
        │              ──/api/analyze──────────────▶  Next.js server ──▶ Claude (API key stays on the server)
        │
        └── http://127.0.0.1:18765 (token) ──▶ bridge/mt5_bridge.py ──▶ MetaTrader 5 terminal (your PC)
```

- **Market data** (`src/lib/market/`): free, keyless feeds, cached on the server.
  Gold, NAS100 and US30 use futures (`GC=F`, `NQ=F`, `YM=F`), so they differ a little from broker CFD prices.
  The UI labels them as possibly delayed.
- **Analyst** (`src/app/api/analyze/route.ts`): sends recent bars plus derived levels to Claude. The answer
  streams into the chat. A setup comes back through a structured `submit_signal` tool call, validated with zod.
- **Execution** (`bridge/`): before any order is sent, the signal is shifted onto the broker's live price.
  It is then re-checked (side, age, drift, risk:reward) and sized from your risk %. You confirm the exact lots
  and money at risk. The bridge repeats the checks and refuses anything over its risk cap.

## Run locally

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY (APP_PASSWORD optional locally)
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## MT5 bridge (Windows, MT5 running and logged in)

```bash
cd bridge
pip install -r requirements.txt
python mt5_bridge.py         # first run creates bridge_config.json and prints a token
```

1. Paste the token in the app's **MT5** tab and save.
2. To use the deployed site, add its URL to `allowed_origins` in `bridge_config.json` and restart the bridge.
3. If your broker uses suffixed symbols, map them in `symbol_map`, e.g. `{"XAUUSD": "XAUUSD.m", "NAS100": "USTEC"}`.
4. Enable Algo Trading in MT5.

The bridge listens only on `127.0.0.1`. It answers only the listed origins and requires the token on every request.
It only manages positions it opened (magic number `234000`).
`max_risk_pct` (default 2) and `min_rr` (default 1) are enforced server-side.
Use Chrome or Edge: Safari won't let an HTTPS site call a local bridge.

Bridge tests (no MT5 needed): `cd bridge && pip install -r requirements-dev.txt && pytest`.

## Deploy (Vercel)

Set these in Project → Settings → Environment Variables. None are `NEXT_PUBLIC_`, so none reach the browser:

| Variable | |
|---|---|
| `ANTHROPIC_API_KEY` | required |
| `APP_PASSWORD` | required in production. The whole site is behind HTTP Basic Auth (any username). |
| `ANTHROPIC_MODEL` | optional, defaults to `claude-opus-5-5` |

## Layout

```
src/app/            page, layout, API routes (analyze, candles, quotes)
src/proxy.ts        password gate (Next 16 "proxy", formerly middleware)
src/components/     Terminal (layout/state), PriceChart, AnalystChat, SignalCard, TradeTicket, Positions, BridgePanel, …
src/hooks/          useCandles/useQuotes, useAnalyst, useBridge
src/lib/            symbols, types, signal validation & pre-trade checks, analysis helpers, bridge client, market feeds
bridge/             mt5_bridge.py + tests
```
