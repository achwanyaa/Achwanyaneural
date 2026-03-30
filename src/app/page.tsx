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

  const [mobilePanel, setMobilePanel] = useState('chart'); // 'chat', 'chart', 'panel'

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col">
      <Toolbar
        symbol={symbol}
        setSymbol={setSymbol}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        candles={candles}
        mt5Online={mt5Online}
        checkMT5={checkMT5}
      />
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <AIAnalyst
          messages={messages}
          loading={loading}
          onSendMessage={sendMessage}
        />
        
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          candles={candles}
          signal={signal}
          chartContainerRef={chartContainerRef}
        />
        
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

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {mobilePanel === 'chat' && (
            <div className="absolute inset-0 animate-spring">
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
            <TradingChart
              symbol={symbol}
              timeframe={timeframe}
              candles={candles}
              signal={signal}
              chartContainerRef={chartContainerRef}
              isMobile
            />
          )}
          
          {mobilePanel === 'panel' && (
            <div className="absolute inset-0 animate-spring">
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
        <div className="flex bg-[var(--bg-secondary)] border-t border-[var(--separator)] safe-area-bottom">
          <button
            onClick={() => setMobilePanel('chat')}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 transition-all ${
              mobilePanel === 'chat' 
                ? 'text-[var(--system-blue)]' 
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-[10px] font-medium">AI Chat</span>
            {messages.length > 0 && (
              <span className="absolute top-1 right-[33%] w-2 h-2 bg-[var(--system-blue)] rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => setMobilePanel('chart')}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 transition-all ${
              mobilePanel === 'chart' 
                ? 'text-[var(--system-blue)]' 
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-[10px] font-medium">Chart</span>
          </button>
          
          <button
            onClick={() => setMobilePanel('panel')}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 transition-all relative ${
              mobilePanel === 'panel' 
                ? 'text-[var(--system-blue)]' 
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[10px] font-medium">Signals</span>
            {signal && (
              <span className="absolute top-1 right-[33%] w-2 h-2 bg-[var(--bullish)] rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
