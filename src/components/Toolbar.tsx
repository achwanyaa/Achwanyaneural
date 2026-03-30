'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Hexagon, Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const timeframes = ['5M', '15M', '30M', '1H', '2H', '4H', '1D'];
  const symbols = [
    { value: 'XAUUSD', label: 'XAU/USD' },
    { value: 'EURUSD', label: 'EUR/USD' },
    { value: 'GBPUSD', label: 'GBP/USD' },
    { value: 'USDJPY', label: 'USD/JPY' },
    { value: 'BTCUSD', label: 'BTC/USD' },
    { value: 'NAS100', label: 'NASDAQ' },
    { value: 'US30', label: 'US30' },
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
    <>
      {/* Main Toolbar - Apple Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] backdrop-blur-xl border-b border-[var(--separator)] flex-shrink-0 safe-area-top">
        {/* Logo - Apple Style */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--system-blue)] to-[var(--system-teal)] flex items-center justify-center shadow-lg">
            <Hexagon className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="hidden sm:block">
            <span className="font-semibold text-lg tracking-tight text-[var(--text-primary)]">
              Neural
            </span>
            <span className="text-[10px] px-1.5 py-0.5 ml-1.5 rounded-md bg-[var(--system-blue)]/20 text-[var(--system-blue)] font-semibold">
              PRO
            </span>
          </div>
        </div>

        {/* Center - Symbol & Timeframe (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Symbol Picker - Apple Style */}
          <div className="relative">
            <select 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              className="appearance-none bg-[var(--fill-primary)] text-[var(--text-primary)] pl-3 pr-8 py-2 rounded-[var(--radius-md)] text-sm font-medium cursor-pointer outline-none focus:ring-2 focus:ring-[var(--system-blue)]"
            >
              {symbols.map(sym => (
                <option key={sym.value} value={sym.value}>{sym.label}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]"/>
              </svg>
            </div>
          </div>

          {/* Timeframe Segmented Control - Apple Style */}
          <div className="flex bg-[var(--fill-primary)] rounded-[var(--radius-md)] p-0.5">
            {timeframes.slice(0, 5).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
                  timeframe === tf 
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm' 
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right - Price & Status */}
        <div className="flex items-center gap-3">
          {/* Price Display */}
          <div className="flex flex-col items-end mr-2">
            <span className="text-lg sm:text-xl font-semibold font-mono text-[var(--text-primary)] tracking-tight">
              {getLastPrice()}
            </span>
            <div className={`flex items-center gap-1 text-xs font-medium ${priceChange.isPositive ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
              {priceChange.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{priceChange.value}</span>
            </div>
          </div>

          {/* MT5 Status - Apple Style */}
          <button 
            onClick={checkMT5}
            className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] transition-all ${
              mt5Online 
                ? 'bg-[var(--bullish)]/10 text-[var(--bullish)]' 
                : 'bg-[var(--bearish)]/10 text-[var(--bearish)]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="text-xs font-semibold">{mt5Online ? 'Live' : 'Off'}</span>
          </button>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-[var(--radius-md)] bg-[var(--fill-primary)] text-[var(--text-secondary)]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Sheet - Apple Style */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 z-50 bg-black/50 backdrop-blur-sm animate-spring" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-0 left-0 right-0 bg-[var(--bg-secondary)] rounded-b-[var(--radius-xl)] border-b border-[var(--separator)] p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Symbol Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2 block">Symbol</label>
              <div className="grid grid-cols-2 gap-2">
                {symbols.map(sym => (
                  <button
                    key={sym.value}
                    onClick={() => { setSymbol(sym.value); setMobileMenuOpen(false); }}
                    className={`p-3 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                      symbol === sym.value
                        ? 'bg-[var(--system-blue)] text-white'
                        : 'bg-[var(--fill-primary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2 block">Timeframe</label>
              <div className="flex flex-wrap gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => { setTimeframe(tf); setMobileMenuOpen(false); }}
                    className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-[var(--system-blue)] text-white'
                        : 'bg-[var(--fill-primary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* MT5 Status */}
            <button 
              onClick={() => { checkMT5(); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] font-medium ${
                mt5Online 
                  ? 'bg-[var(--bullish)]/15 text-[var(--bullish)]' 
                  : 'bg-[var(--bearish)]/15 text-[var(--bearish)]'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>MT5 {mt5Online ? 'Connected' : 'Disconnected'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
