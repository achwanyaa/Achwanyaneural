'use client';

import { TrendingUp, TrendingDown, Activity, Hexagon } from 'lucide-react';

interface ToolbarProps {
  symbol: string;
  setSymbol: (symbol: string) => void;
  timeframe: string;
  setTimeframe: (timeframe: string) => void;
  candles: any[];
  mt5Online: boolean;
  checkMT5: () => void;
}

export default function Toolbar({ 
  symbol, 
  setSymbol, 
  timeframe, 
  setTimeframe, 
  candles, 
  mt5Online, 
  checkMT5 
}: ToolbarProps) {
  const timeframes = ['5M', '15M', '30M', '1H', '2H', '4H', '1D'];
  const symbols = [
    { value: 'XAUUSD', label: 'XAU/USD', type: 'commodity' },
    { value: 'EURUSD', label: 'EUR/USD', type: 'forex' },
    { value: 'GBPUSD', label: 'GBP/USD', type: 'forex' },
    { value: 'USDJPY', label: 'USD/JPY', type: 'forex' },
    { value: 'BTCUSD', label: 'BTC/USD', type: 'crypto' },
    { value: 'NAS100', label: 'NASDAQ', type: 'index' },
    { value: 'US30', label: 'US30', type: 'index' },
  ];

  const getLastPrice = () => {
    if (!candles.length) return '3,120.50';
    const last = candles[candles.length - 1];
    return last.c.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPriceChange = () => {
    if (!candles.length) return { value: '+0.00%', isPositive: true };
    const change = ((candles[candles.length - 1].c - candles[0].o) / candles[0].o * 100);
    return {
      value: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
      isPositive: change >= 0
    };
  };

  const priceChange = getPriceChange();

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex-shrink-0 h-14">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Hexagon className="w-6 h-6 text-[var(--accent-cyan)]" strokeWidth={1.5} />
        <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
          NEURAL
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-medium">
          PRO
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--border-primary)]" />

      {/* Symbol Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] font-medium">SYMBOL</span>
        <select 
          value={symbol} 
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer outline-none focus:border-[var(--accent-cyan)] transition-colors"
        >
          {symbols.map(sym => (
            <option key={sym.value} value={sym.value}>{sym.label}</option>
          ))}
        </select>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              timeframe === tf 
                ? 'bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/30' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Price Display */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {getLastPrice()}
          </span>
          <div className={`flex items-center gap-1 text-sm font-semibold ${priceChange.isPositive ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
            {priceChange.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{priceChange.value}</span>
          </div>
        </div>
      </div>

      {/* MT5 Status */}
      <div 
        onClick={checkMT5}
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--accent-cyan)]/50"
      >
        <Activity className={`w-4 h-4 ${mt5Online ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`} />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">MT5</span>
          <span className={`text-xs font-bold ${mt5Online ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
            {mt5Online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${mt5Online ? 'bg-[var(--bullish)] animate-pulse' : 'bg-[var(--bearish)]'}`} />
      </div>
    </div>
  );
}
