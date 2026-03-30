'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Menu, X } from 'lucide-react';

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
    if (!candles.length) return { value: '+0.42%', isPositive: true };
    const change = ((candles[candles.length - 1].c - candles[0].o) / candles[0].o * 100);
    return {
      value: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
      isPositive: change >= 0
    };
  };

  const priceChange = getPriceChange();

  return (
    <>
      {/* Neural Toolbar */}
      <nav className="bg-[#1a1a1a] border-b border-[#00f5ff]/20 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-[#00f5ff] rounded-xl flex items-center justify-center text-black font-bold shadow-[0_0_10px_rgba(0,245,255,0.5)]">
            <Zap className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold tracking-tight text-white">AchwanyaNeural</h1>
            <p className="text-[10px] text-[#00f5ff] uppercase tracking-wider">Neural Trading Terminal • PRO</p>
          </div>
        </div>

        {/* Center - Asset & Price */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-lg font-mono font-semibold text-white">{symbol}</div>
            <div>
              <span className="text-2xl font-mono font-bold text-white">{getLastPrice()}</span>
              <span className={`ml-2 text-sm font-medium ${priceChange.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange.isPositive ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                {priceChange.value}
              </span>
            </div>
            <div className="px-3 py-1 bg-[#00f5ff]/10 text-[#00f5ff] text-xs font-semibold rounded-full flex items-center gap-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              LIVE
            </div>
          </div>

          {/* Timeframes - Hidden on mobile */}
          <div className="hidden md:flex gap-1 bg-[#252525] p-1 rounded-2xl">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-1.5 text-sm font-medium rounded-xl transition-all ${
                  timeframe === tf 
                    ? 'bg-[#00f5ff] text-black' 
                    : 'text-gray-400 hover:bg-[#00f5ff]/20 hover:text-[#00f5ff]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right - MT5 & Menu */}
        <div className="flex items-center gap-3">
          <button 
            onClick={checkMT5}
            className="hidden sm:flex px-5 py-2 bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-semibold rounded-2xl items-center gap-2 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)]"
          >
            <Activity className="w-4 h-4" />
            CONNECT MT5
          </button>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#252525] text-gray-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-[60px] left-4 right-4 bg-[#1a1a1a] rounded-3xl border border-[#00f5ff]/20 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Symbol Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Symbol</label>
              <div className="grid grid-cols-2 gap-2">
                {symbols.map(sym => (
                  <button
                    key={sym.value}
                    onClick={() => { setSymbol(sym.value); setMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      symbol === sym.value
                        ? 'bg-[#00f5ff] text-black'
                        : 'bg-[#252525] text-gray-400'
                    }`}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Timeframe</label>
              <div className="flex flex-wrap gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => { setTimeframe(tf); setMobileMenuOpen(false); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-[#00f5ff] text-black'
                        : 'bg-[#252525] text-gray-400'
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
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium ${
                mt5Online 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
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
