'use client';

import { Target, BarChart3, Cpu, Play, Trash2, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react';

interface RightPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  signal: any;
  positions: any[];
  mt5Online: boolean;
  mt5Url: string;
  setMt5Url: (url: string) => void;
  checkMT5: () => void;
  placeTrade: () => void;
  setSignal: (signal: any) => void;
  symbol: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function RightPanel({ 
  activeTab, 
  setActiveTab, 
  signal, 
  positions, 
  mt5Online, 
  mt5Url, 
  setMt5Url, 
  checkMT5, 
  placeTrade, 
  setSignal, 
  symbol,
  onClose,
  isMobile
}: RightPanelProps) {
  const tabs = [
    { id: 'signal', label: 'Signal', icon: Target },
    { id: 'pos', label: 'Trades', icon: BarChart3 },
    { id: 'bridge', label: 'MT5', icon: Cpu }
  ];

  const BRIDGE_CODE = `# pip install fastapi uvicorn MetaTrader5
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import MetaTrader5 as mt5, uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"])

mt5.initialize()

@app.get("/status")
def status():
  info = mt5.terminal_info()
  return {"ok": info is not None}

@app.post("/trade")
def trade(b: dict):
  t = (mt5.ORDER_TYPE_BUY
       if b["dir"]=="buy"
       else mt5.ORDER_TYPE_SELL)
  tick = mt5.symbol_info_tick(b["sym"])
  price = tick.ask if b["dir"]=="buy" else tick.bid
  r = mt5.order_send({
    "action": mt5.TRADE_ACTION_DEAL,
    "symbol": b["sym"],
    "volume": b.get("vol", 0.01),
    "type": t, "price": price,
    "sl": b.get("sl"), "tp": b.get("tp"),
    "deviation": 20, "magic": 234000,
    "comment": "NeuralBot",
    "type_time": mt5.ORDER_TIME_GTC,
    "type_filling": mt5.ORDER_FILLING_IOC,
  })
  return {"ticket": r.order, "retcode": r.retcode}

if __name__ == "__main__":
  uvicorn.run(app, host="0.0.0.0", port=8000)`;

  const SYMBOLS = {
    XAUUSD: { d: 2 },
    EURUSD: { d: 5 },
    GBPUSD: { d: 5 },
    USDJPY: { d: 3 },
    BTCUSD: { d: 0 },
    NAS100: { d: 0 },
    US30: { d: 0 }
  };

  const { d } = SYMBOLS[symbol as keyof typeof SYMBOLS] || SYMBOLS.XAUUSD;

  const renderSignalTab = () => {
    if (!signal) {
      return (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-muted)] font-medium">No Signal Yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Ask the AI analyst to<br/>analyze the chart</p>
        </div>
      );
    }

    const isBuy = signal.dir === 'buy';
    const colorClass = isBuy ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]';
    const bgClass = isBuy ? 'bg-[var(--bullish)]/10 border-[var(--bullish)]/30' : 'bg-[var(--bearish)]/10 border-[var(--bearish)]/30';
    const btnClass = isBuy ? 'bg-[var(--bullish)] hover:bg-[var(--bullish)]/90' : 'bg-[var(--bearish)] hover:bg-[var(--bearish)]/90';

    return (
      <div className="flex flex-col gap-3">
        {/* Direction Badge */}
        <div className={`p-4 rounded-lg border ${bgClass} text-center`}>
          <div className={`text-2xl font-bold ${colorClass} uppercase tracking-wider`}>
            {signal.dir}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            {signal.conf}% Confidence
          </div>
        </div>
        
        {/* Levels */}
        <div className="space-y-2">
          {[
            { label: 'ENTRY', value: signal.entry, color: colorClass },
            { label: 'STOP LOSS', value: signal.sl, color: 'text-[var(--bearish)]' },
            { label: 'TAKE PROFIT', value: signal.tp, color: 'text-[var(--bullish)]' }
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
              <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
              <span className={`font-mono font-bold text-sm ${color}`}>
                {value?.toFixed(d) ?? '-'}
              </span>
            </div>
          ))}
        </div>
        
        {signal.rr && (
          <div className="flex justify-between px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
            <span className="text-xs text-[var(--text-muted)] font-medium">RISK:REWARD</span>
            <span className="font-mono font-bold text-sm text-[var(--accent-gold)]">{signal.rr}</span>
          </div>
        )}
        
        {signal.reason && (
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)] text-xs text-[var(--text-secondary)] leading-relaxed">
            {signal.reason}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={placeTrade}
            disabled={!mt5Online}
            className={`w-full px-4 py-3 rounded-lg font-bold text-sm tracking-wide text-white transition-all flex items-center justify-center gap-2 ${
              mt5Online
                ? `${btnClass} shadow-lg shadow-current/20`
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          >
            {mt5Online ? (
              <>
                <Play className="w-4 h-4" />
                EXECUTE {signal.dir.toUpperCase()}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                CONNECT MT5 FIRST
              </>
            )}
          </button>
          
          <button
            onClick={() => setSignal(null)}
            className="w-full px-4 py-2 rounded-lg text-xs text-[var(--text-muted)] bg-transparent border border-[var(--border-primary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3 h-3" />
            DISMISS SIGNAL
          </button>
        </div>
      </div>
    );
  };

  const renderPositionsTab = () => {
    if (!positions.length) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-muted)] font-medium">No Open Positions</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {positions.map((position, index) => {
          const isBuy = position.dir === 'buy';
          return (
            <div key={index} className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold text-sm ${isBuy ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                  {position.dir.toUpperCase()} {position.symbol}
                </span>
                <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                  #{position.ticket}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>Entry: {position.entry?.toFixed(d)}</span>
                <span className="text-[var(--bearish)]">SL: {position.sl?.toFixed(d)}</span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-2">
                {new Date(position.time).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBridgeTab = () => (
    <div className="flex flex-col gap-4">
      <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Connect your MetaTrader 5 terminal to enable live trade execution.
        </p>
      </div>
      
      {/* URL Input */}
      <div>
        <label className="text-xs text-[var(--text-muted)] font-medium mb-1.5 block">BRIDGE URL</label>
        <div className="flex gap-2">
          <input
            value={mt5Url}
            onChange={(e) => setMt5Url(e.target.value)}
            placeholder="http://localhost:8000"
            className="flex-1 font-mono text-xs px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg outline-none focus:border-[var(--accent-cyan)] transition-colors text-[var(--text-primary)]"
          />
          <button
            onClick={checkMT5}
            className="px-3 py-2 rounded-lg bg-[var(--accent-blue)]/20 border border-[var(--accent-blue)]/40 text-[var(--accent-blue)] text-xs font-medium hover:bg-[var(--accent-blue)]/30 transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            TEST
          </button>
        </div>
      </div>
      
      {/* Code Block */}
      <div>
        <label className="text-xs text-[var(--text-muted)] font-medium mb-1.5 block flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          mt5_bridge.py
        </label>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3 text-[10px] font-mono text-[var(--text-muted)] overflow-x-auto max-h-40 overflow-y-auto leading-relaxed">
          <pre>{BRIDGE_CODE}</pre>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(BRIDGE_CODE)}
          className="mt-2 w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="w-3 h-3" />
          COPY CODE
        </button>
      </div>
      
      {/* Instructions */}
      <div className="p-3 bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 rounded-lg">
        <p className="text-xs text-[var(--accent-gold)] leading-relaxed font-medium">
          SETUP STEPS:
        </p>
        <ol className="text-[11px] text-[var(--accent-gold)]/80 mt-2 space-y-1 ml-3">
          <li>1. pip install fastapi uvicorn MetaTrader5</li>
          <li>2. Save code as mt5_bridge.py</li>
          <li>3. python mt5_bridge.py</li>
          <li>4. Click TEST to verify</li>
        </ol>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'signal': return renderSignalTab();
      case 'pos': return renderPositionsTab();
      case 'bridge': return renderBridgeTab();
      default: return null;
    }
  };

  const ActiveIcon = tabs.find(t => t.id === activeTab)?.icon || Target;

  return (
    <div className="w-56 flex-shrink-0 border-l border-[var(--border-primary)] flex flex-col bg-[var(--bg-secondary)]">
      {/* Header with Icon */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
        <ActiveIcon className="w-5 h-5 text-[var(--accent-cyan)]" />
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {tabs.find(t => t.id === activeTab)?.label}
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)] bg-[var(--bg-card)]'
                  : 'text-[var(--text-muted)] border-b-2 border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
