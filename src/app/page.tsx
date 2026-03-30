'use client';

import { useState, useEffect, useRef } from 'react';
import TradingChart from '@/components/TradingChart';
import AIAnalyst from '@/components/AIAnalyst';
import RightPanel from '@/components/RightPanel';
import Toolbar from '@/components/Toolbar';

const SYMBOLS = {
  XAUUSD: { p: 3120.5, v: 0.003, d: 2 },
  EURUSD: { p: 1.0825, v: 0.0007, d: 5 },
  GBPUSD: { p: 1.2640, v: 0.001, d: 5 },
  USDJPY: { p: 151.20, v: 0.001, d: 3 },
  BTCUSD: { p: 84250, v: 0.012, d: 0 },
  NAS100: { p: 19850, v: 0.005, d: 0 },
  US30: { p: 42100, v: 0.004, d: 0 }
};

export default function Home() {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('15M');
  const [candles, setCandles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [signal, setSignal] = useState(null);
  const [positions, setPositions] = useState([]);
  const [mt5Online, setMt5Online] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signal');
  const [mt5Url, setMt5Url] = useState('http://localhost:8000');
  const chartContainerRef = useRef(null);

  const generateCandles = (sym, n = 90) => {
    const { p: sp, v: vol, d } = SYMBOLS[sym] || SYMBOLS.XAUUSD;
    const out = [];
    let price = sp;
    for (let i = n; i >= 0; i--) {
      const o = price;
      const drift = (Math.random() - 0.485) * price * vol;
      const c = Math.max(o * 0.95, o + drift);
      const w = Math.random() * Math.abs(drift) * 1.5;
      const h = Math.max(o, c) + w;
      const l = Math.min(o, c) - Math.random() * Math.abs(drift) * 0.7;
      out.push({
        o: +o.toFixed(d),
        h: +h.toFixed(d),
        l: +l.toFixed(d),
        c: +c.toFixed(d),
        v: Math.floor(Math.random() * 8000 + 1000),
        b: c >= o
      });
      price = c + (Math.random() - 0.5) * price * vol * 0.12;
      price = Math.max(price, sp * 0.8);
    }
    return out;
  };

  useEffect(() => {
    setCandles(generateCandles(symbol));
    setSignal(null);
  }, [symbol, timeframe]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!candles.length) return;
      const last = candles[candles.length - 1];
      const { v, d } = SYMBOLS[symbol] || SYMBOLS.XAUUSD;
      last.c = +(last.c * (1 + (Math.random() - 0.5) * v * 0.08)).toFixed(d);
      last.h = Math.max(last.h, last.c);
      last.l = Math.min(last.l, last.c);
      last.b = last.c >= last.o;
      setCandles([...candles]);
    }, 3000);

    return () => clearInterval(interval);
  }, [candles, symbol]);

  const getContext = () => {
    const { d } = SYMBOLS[symbol] || SYMBOLS.XAUUSD;
    const recent = candles.slice(-10);
    const last5 = candles.slice(-5);
    const bulls = last5.filter(c => c.b).length;
    const trend = bulls >= 4 ? 'bullish' : bulls <= 1 ? 'bearish' : 'sideways';
    const last = candles[candles.length - 1];
    
    return {
      symbol,
      timeframe,
      trend,
      currentPrice: last?.c.toFixed(d),
      recentHigh: Math.max(...recent.map(c => c.h)).toFixed(d),
      recentLow: Math.min(...recent.map(c => c.l)).toFixed(d),
      lastCandle: {
        o: last?.o.toFixed(d),
        h: last?.h.toFixed(d),
        l: last?.l.toFixed(d),
        c: last?.c.toFixed(d),
        bullish: last?.b
      }
    };
  };

  const addMessage = (role, content, isError = false) => {
    setMessages(prev => [...prev, { role, content, err: isError, time: new Date() }]);
  };

  const sendMessage = async (text) => {
    if (!text || loading) return;
    
    addMessage('user', text);
    setLoading(true);

    const system = `You are an expert trading analyst specializing in ICT/SMC concepts, price action, and smart money trading. You analyze forex, gold, crypto, and indices for intraday trades (5min-2hr holding periods).

Market context: ${JSON.stringify(getContext())}

ALWAYS end responses with a JSON block like this:
\`\`\`json
{"signal":"buy"or"sell"or"no_trade","conf":75,"entry":3118.50,"sl":3112.00,"tp":3135.00,"rr":"1:2.5","reason":"Bearish OB rejection at 3120 with CHoCH confirmed"}
\`\`\`
Be precise, reference price levels, think smart money. Keep it concise.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: system,
          messages: messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Error getting response.';
      const jsonMatch = text.match(/```json\n?([\s\S]*?)```/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.signal !== 'no_trade') {
            setSignal({
              dir: parsed.signal,
              conf: parsed.conf,
              entry: parsed.entry,
              sl: parsed.sl,
              tp: parsed.tp,
              rr: parsed.rr,
              reason: parsed.reason
            });
            setActiveTab('signal');
          }
        } catch (e) {
          console.error('Failed to parse signal:', e);
        }
      }
      
      setLoading(false);
      addMessage('assistant', text);
    } catch (e) {
      setLoading(false);
      addMessage('assistant', 'Connection error. Check API access.', true);
    }
  };

  const checkMT5 = async () => {
    try {
      const response = await fetch(mt5Url + '/status', { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        setMt5Online(true);
      } else {
        throw new Error();
      }
    } catch {
      setMt5Online(false);
    }
  };

  const placeTrade = async () => {
    if (!signal || !mt5Online) return;
    
    const { d } = SYMBOLS[symbol] || SYMBOLS.XAUUSD;
    try {
      const response = await fetch(mt5Url + '/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sym: symbol,
          dir: signal.dir,
          sl: signal.sl,
          tp: signal.tp,
          vol: 0.01
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const ticket = result.ticket || Math.floor(Math.random() * 99999);
        setPositions(prev => [...prev, {
          ...signal,
          symbol,
          timeframe,
          time: new Date(),
          ticket
        }]);
        
        addMessage('assistant', `✅ Trade placed — Ticket #${ticket}\n${signal.dir.toUpperCase()} ${symbol} @ ${signal.entry?.toFixed(d)}\nSL: ${signal.sl?.toFixed(d)} | TP: ${signal.tp?.toFixed(d)}`);
        setActiveTab('pos');
      }
    } catch {
      addMessage('assistant', '❌ MT5 bridge unreachable. Run: python mt5_bridge.py', true);
    }
  };

  useEffect(() => {
    addMessage('assistant', `Ready. I can analyze ${symbol} ${timeframe} using ICT/SMC concepts and generate signals with entry, SL, and TP plotted on the chart.\n\nTo enable live trading:\n→ Go to the MT5 tab\n→ Copy the Python bridge code\n→ Run it locally\n→ Test the connection\n\nTry: "Analyze the current chart and give me a trade setup"`);
  }, []);

  const [mobilePanel, setMobilePanel] = useState('chart');

  const watchlist = [
    { symbol: 'XAUUSD', change: '+0.42%', up: true },
    { symbol: 'EURUSD', change: '-0.18%', up: false },
    { symbol: 'GBPUSD', change: '+0.25%', up: true },
    { symbol: 'BTCUSD', change: '+1.24%', up: true },
    { symbol: 'NAS100', change: '-0.45%', up: false },
  ];

  return (
    <div className="h-screen bg-[#0f0f0f] text-white overflow-hidden flex flex-col">
      <Toolbar
        symbol={symbol}
        setSymbol={setSymbol}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        candles={candles}
        mt5Online={mt5Online}
        checkMT5={checkMT5}
      />
      
      {/* Desktop Layout - Neural Design */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Sidebar - Watchlist */}
        <div className="w-60 flex-shrink-0 bg-[#1a1a1a] border-r border-[#00f5ff]/10 p-4 flex flex-col">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-medium">Watchlist</h3>
          <div className="space-y-1">
            {watchlist.map((item) => (
              <div 
                key={item.symbol}
                onClick={() => setSymbol(item.symbol)}
                className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${
                  symbol === item.symbol 
                    ? 'bg-[#00f5ff]/10 border border-[#00f5ff]/30' 
                    : 'hover:bg-[#252525]'
                }`}
              >
                <span className="font-mono font-medium text-sm">{item.symbol}</span>
                <span className={`text-xs font-medium ${item.up ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change}
                </span>
              </div>
            ))}
          </div>
          
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4 mt-8 font-medium">Recent Signals</h3>
          <div className="text-xs text-gray-500 bg-[#252525] p-3 rounded-xl">
            {signal ? (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${signal.dir === 'buy' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className="text-white font-medium">{signal.dir.toUpperCase()} {symbol}</span>
                <span className="text-gray-400">@{signal.entry}</span>
              </div>
            ) : (
              'No signals yet • AI is analyzing...'
            )}
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col bg-[#0f0f0f]">
          <div className="flex-1 bg-[#111] border border-[#00f5ff]/10 m-4 rounded-3xl relative overflow-hidden">
            <TradingChart
              symbol={symbol}
              timeframe={timeframe}
              candles={candles}
              signal={signal}
              chartContainerRef={chartContainerRef}
            />
          </div>
          
          {/* Quick AI Summary */}
          <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-3xl p-4 grid grid-cols-3 gap-4 text-sm border border-[#00f5ff]/10">
            <div className="text-center border-r border-[#00f5ff]/10">
              <p className="text-green-400 text-xs mb-1">Market Bias</p>
              <p className="text-xl font-mono font-bold">Bullish</p>
            </div>
            <div className="text-center border-r border-[#00f5ff]/10">
              <p className="text-amber-400 text-xs mb-1">Structure</p>
              <p className="text-xl font-mono font-bold">Order Block</p>
            </div>
            <div className="text-center">
              <p className="text-[#00f5ff] text-xs mb-1">Next Target</p>
              <p className="text-xl font-mono font-bold">3,145.00</p>
            </div>
          </div>
        </div>

        {/* Right Panel - AI Chat */}
        <div className="w-80 flex-shrink-0 bg-[#1a1a1a] border-l border-[#00f5ff]/10">
          <RightPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            signal={signal}
            positions={positions}
            mt5Online={mt5Online}
            mt5Url={mt5Url}
            setMt5Url={setMt5Url}
            checkMT5={checkMT5}
            placeTrade={placeTrade}
            setSignal={setSignal}
            symbol={symbol}
          />
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {mobilePanel === 'chat' && (
            <div className="absolute inset-0">
              <AIAnalyst
                messages={messages}
                loading={loading}
                onSendMessage={sendMessage}
                onClose={() => setMobilePanel('chart')}
                isMobile
              />
            </div>
          )}
          
          {mobilePanel === 'chart' && (
            <div className="h-full bg-[#111] border border-[#00f5ff]/10 m-2 rounded-2xl">
              <TradingChart
                symbol={symbol}
                timeframe={timeframe}
                candles={candles}
                signal={signal}
                chartContainerRef={chartContainerRef}
                isMobile
              />
            </div>
          )}
          
          {mobilePanel === 'panel' && (
            <div className="absolute inset-0">
              <RightPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                signal={signal}
                positions={positions}
                mt5Online={mt5Online}
                mt5Url={mt5Url}
                setMt5Url={setMt5Url}
                checkMT5={checkMT5}
                placeTrade={placeTrade}
                setSignal={setSignal}
                symbol={symbol}
                onClose={() => setMobilePanel('chart')}
                isMobile
              />
            </div>
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex bg-[#1a1a1a] border-t border-[#00f5ff]/20 pb-safe">
          <button
            onClick={() => setMobilePanel('chat')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all ${
              mobilePanel === 'chat' ? 'text-[#00f5ff]' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-[10px] font-medium">AI Chat</span>
          </button>
          
          <button
            onClick={() => setMobilePanel('chart')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all ${
              mobilePanel === 'chart' ? 'text-[#00f5ff]' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-[10px] font-medium">Chart</span>
          </button>
          
          <button
            onClick={() => setMobilePanel('panel')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all relative ${
              mobilePanel === 'panel' ? 'text-[#00f5ff]' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[10px] font-medium">Signals</span>
            {signal && (
              <span className="absolute top-2 right-[33%] w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-[#1a1a1a] border-t border-[#00f5ff]/10 text-xs">
        <div className="flex items-center gap-4">
          {signal ? (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${signal.dir === 'buy' ? 'bg-green-400 animate-pulse' : 'bg-red-400 animate-pulse'}`}></span>
              <span className="font-medium text-white">Signal: {signal.dir === 'buy' ? 'Strong Buy' : 'Strong Sell'}</span>
              <span className="text-gray-500">•</span>
              <span className="text-[#00f5ff]">{signal.conf}% confidence</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">Entry: {signal.entry}</span>
            </div>
          ) : (
            <span className="text-gray-500">No active signal • Ask AI to analyze</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <span className={mt5Online ? 'text-green-400' : 'text-red-400'}>
            {mt5Online ? '● MT5 Connected' : '● MT5 Disconnected'}
          </span>
          <span>Ready to analyze</span>
        </div>
      </div>
    </div>
  );
}
