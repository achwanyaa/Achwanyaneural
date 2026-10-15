'use client';

import type { BridgeStatus } from '@/lib/bridge';

interface Props {
  updatedAt: number | null;
  feedError: string | null;
  bridge: BridgeStatus | null;
}

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function StatusBar({ updatedAt, feedError, bridge }: Props) {
  return (
    <footer className="hidden h-6 shrink-0 items-center gap-5 border-t border-line bg-panel px-3 text-[11px] text-muted lg:flex">
      <span className={feedError ? 'text-down' : ''}>
        {feedError ? `Feed error: ${feedError}` : updatedAt ? `Free data feed, may be delayed · updated ${time(updatedAt)}` : 'Connecting to data feed…'}
      </span>
      <span>
        {bridge
          ? `MT5 ${bridge.account.demo ? 'demo' : 'LIVE'} · #${bridge.account.login} ${bridge.account.server} · ${bridge.account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bridge.account.currency}`
          : 'MT5 not connected'}
      </span>
      <span className="ml-auto text-faint">AI analysis is not financial advice</span>
      <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="text-faint hover:text-ink">
        Charts by TradingView
      </a>
    </footer>
  );
}
