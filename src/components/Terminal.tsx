'use client';

import { useCallback, useState } from 'react';
import { useAnalyst } from '@/hooks/useAnalyst';
import { useBridge } from '@/hooks/useBridge';
import { useCandles, useQuotes } from '@/hooks/useMarketData';
import { useTheme } from '@/hooks/useTheme';
import type { SignalInput, TradeSignal } from '@/lib/signal';
import type { SymbolId, Timeframe } from '@/lib/types';
import AnalystChat from './AnalystChat';
import BridgePanel from './BridgePanel';
import ChartLegend from './ChartLegend';
import Positions from './Positions';
import PriceChart from './PriceChart';
import SignalCard from './SignalCard';
import StatusBar from './StatusBar';
import Toolbar from './Toolbar';
import TradeTicket from './TradeTicket';
import Watchlist from './Watchlist';

type PanelTab = 'chat' | 'signal' | 'trades' | 'mt5';
/** Mobile shows one view at a time; desktop always shows the chart plus one panel tab. */
type View = 'chart' | PanelTab;

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'chat', label: 'Analyst' },
  { id: 'signal', label: 'Signal' },
  { id: 'trades', label: 'Positions' },
  { id: 'mt5', label: 'Connection' },
];
const MOBILE_TABS: { id: View; label: string }[] = [{ id: 'chart', label: 'Chart' }, ...PANEL_TABS.map((t) => (t.id === 'mt5' ? { ...t, label: 'MT5' } : t))];

export default function Terminal() {
  const [symbol, setSymbol] = useState<SymbolId>('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('15M');
  const [panel, setPanel] = useState<PanelTab>('chat');
  const [mobileView, setMobileView] = useState<View>('chart');
  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { pref: themePref, theme, setTheme } = useTheme();
  const { candles, error: candleError, loading: candlesLoading, updatedAt } = useCandles(symbol, timeframe);
  const quotes = useQuotes();
  const bridgeHandle = useBridge();
  const lastPrice = candles[candles.length - 1]?.close ?? quotes[symbol]?.price ?? null;

  const show = useCallback((tab: PanelTab) => {
    setPanel(tab);
    setMobileView(tab);
  }, []);

  const onSignal = useCallback(
    (s: SignalInput, feedPrice: number) => {
      if (s.direction === 'no_trade' || s.entry == null || s.stop_loss == null || s.take_profit == null) return;
      setSignal({
        id: crypto.randomUUID(),
        symbol,
        timeframe,
        side: s.direction,
        confidence: s.confidence,
        entry: s.entry,
        stopLoss: s.stop_loss,
        takeProfit: s.take_profit,
        reasoning: s.reasoning,
        feedPrice,
        createdAt: Date.now(),
      });
    },
    [symbol, timeframe],
  );

  const analyst = useAnalyst(symbol, timeframe, onSignal);

  const changeSymbol = (s: SymbolId) => {
    setSymbol(s);
    setMobileView((v) => (v === 'chat' || v === 'signal' ? v : 'chart'));
  };

  const panelContent: Record<PanelTab, React.ReactNode> = {
    chat: (
      <AnalystChat
        symbol={symbol}
        timeframe={timeframe}
        messages={analyst.messages}
        loading={analyst.loading}
        onSend={analyst.send}
        onStop={analyst.stop}
        onClear={analyst.clear}
      />
    ),
    signal: (
      <SignalCard
        signal={signal}
        bridgeOnline={bridgeHandle.online}
        onExecute={() => {
          if (signal && signal.symbol !== symbol) setSymbol(signal.symbol);
          setTicketOpen(true);
        }}
        onDismiss={() => setSignal(null)}
        onConnect={() => show('mt5')}
      />
    ),
    trades: (
      <Positions
        positions={bridgeHandle.positions}
        online={bridgeHandle.online}
        currency={bridgeHandle.status?.account.currency}
        onClosePosition={bridgeHandle.closePosition}
      />
    ),
    mt5: <BridgePanel handle={bridgeHandle} />,
  };

  const activePanel: PanelTab = mobileView === 'chart' ? panel : mobileView;
  const badge = (id: View) => (id === 'signal' && signal ? ' •' : id === 'trades' && bridgeHandle.positions.length ? ` ${bridgeHandle.positions.length}` : '');

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <Toolbar
        symbol={symbol}
        onSymbol={changeSymbol}
        timeframe={timeframe}
        onTimeframe={setTimeframe}
        lastPrice={lastPrice}
        quote={quotes[symbol]}
        bridgeOnline={bridgeHandle.online}
        bridgeDemo={bridgeHandle.status?.account.demo ?? null}
        onBridgeClick={() => show('mt5')}
        themePref={themePref}
        onThemePref={setTheme}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[248px] shrink-0 border-r border-line bg-panel lg:block">
          <Watchlist symbol={symbol} onSymbol={changeSymbol} quotes={quotes} />
        </aside>

        {/* Chart: always visible on desktop; on mobile only in the chart view. Mounted once either way. */}
        <main className={`min-w-0 flex-1 flex-col ${mobileView === 'chart' ? 'flex' : 'hidden'} lg:flex`}>
          <ChartLegend symbol={symbol} timeframe={timeframe} candles={candles} />
          <div className="relative min-h-0 flex-1">
            <PriceChart symbol={symbol} timeframe={timeframe} candles={candles} signal={signal} theme={theme} />
            {(candlesLoading || candleError) && (
              <p className={`absolute left-3 top-3 text-xs ${candleError ? 'text-down' : 'text-muted'}`}>
                {candleError ?? `Loading ${symbol}…`}
              </p>
            )}
          </div>
        </main>

        <section
          className={`min-w-0 flex-1 flex-col bg-panel lg:flex lg:w-[360px] lg:flex-none lg:border-l lg:border-line ${mobileView === 'chart' ? 'hidden' : 'flex'}`}
        >
          <div className="hidden h-8 shrink-0 border-b border-line px-1 lg:flex" role="tablist">
            {PANEL_TABS.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={panel === id}
                onClick={() => show(id)}
                className={`relative px-2.5 text-xs ${panel === id ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
              >
                {label}
                <span className="num text-accent">{badge(id)}</span>
                {panel === id && <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-accent" />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">{panelContent[activePanel]}</div>
        </section>
      </div>

      <StatusBar updatedAt={updatedAt} feedError={candleError} bridge={bridgeHandle.status} />

      {/* Mobile tab bar */}
      <nav className="flex shrink-0 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => (id === 'chart' ? setMobileView('chart') : show(id))}
            className={`relative h-11 flex-1 text-xs ${mobileView === id ? 'font-semibold text-ink' : 'text-muted'}`}
          >
            {mobileView === id && <span className="absolute inset-x-3 top-0 h-0.5 bg-accent" />}
            {label}
            <span className="num text-accent">{badge(id)}</span>
          </button>
        ))}
      </nav>

      {ticketOpen && signal && bridgeHandle.status && lastPrice != null && signal.symbol === symbol && (
        <TradeTicket
          signal={signal}
          settings={bridgeHandle.settings}
          demo={bridgeHandle.status.account.demo}
          feedPrice={lastPrice}
          onClose={() => {
            setTicketOpen(false);
            if (orderPlaced) {
              setOrderPlaced(false);
              setSignal(null);
              show('trades');
            }
          }}
          onPlaced={() => {
            setOrderPlaced(true);
            void bridgeHandle.refreshPositions();
          }}
        />
      )}
    </div>
  );
}
