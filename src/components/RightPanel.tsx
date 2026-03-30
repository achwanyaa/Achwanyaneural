'use client';

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
  symbol 
}: RightPanelProps) {
  const tabs = ['signal', 'pos', 'bridge'];
  const tabLabels = { signal: 'Signal', pos: 'Trades', bridge: 'MT5' };

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
        <div className="text-center py-10 text-muted leading-loose text-xs">
          <div className="text-2xl opacity-15 mb-2">◎</div>
          No signal yet<br/>
          <span className="text-xs text-muted">Ask the analyst to<br/>analyze the chart</span>
        </div>
      );
    }

    const color = signal.dir === 'buy' ? 'text-green' : 'text-red';
    const bgColor = signal.dir === 'buy' ? 'bg-green/10 border-green/30' : 'bg-red/10 border-red/30';

    return (
      <div className="flex flex-col gap-1.5">
        <div className={`px-2.5 py-2.5 rounded text-center ${bgColor} border`}>
          <div className={`text-base font-bold ${color} tracking-wider`}>
            {signal.dir.toUpperCase()}
          </div>
          <div className="text-xs text-muted mt-0.5 font-mono">
            {signal.conf}% confidence
          </div>
        </div>
        
        {[
          ['ENTRY', signal.entry, color],
          ['STOP LOSS', signal.sl, 'text-red'],
          ['TAKE PROFIT', signal.tp, 'text-green']
        ].map(([label, value, valueColor]) => (
          <div key={label} className="flex justify-between items-center px-2 py-1.5 bg-surface rounded border border-border">
            <span className="text-xs text-muted font-mono">{label}</span>
            <span className={`font-mono font-bold ${valueColor} text-xs`}>
              {value?.toFixed(d) ?? '-'}
            </span>
          </div>
        ))}
        
        {signal.rr && (
          <div className="flex justify-between px-1.5 py-1 bg-surface rounded border border-border">
            <span className="text-xs text-muted font-mono">R:R</span>
            <span className="font-mono text-gold font-bold text-xs">{signal.rr}</span>
          </div>
        )}
        
        {signal.reason && (
          <div className="px-2 py-1.5 bg-surface rounded border border-border text-xs text-dim leading-relaxed">
            {signal.reason}
          </div>
        )}
        
        <button
          onClick={placeTrade}
          disabled={!mt5Online}
          className={`px-2 py-2 rounded font-bold text-xs tracking-wide transition-colors ${
            mt5Online
              ? `${signal.dir === 'buy' ? 'bg-green text-background' : 'bg-red text-background'} cursor-pointer`
              : 'bg-surface text-muted cursor-not-allowed'
          }`}
        >
          {mt5Online ? `▶ Place ${signal.dir.toUpperCase()} Trade` : 'Connect MT5 First'}
        </button>
        
        <button
          onClick={() => setSignal(null)}
          className="px-1 py-1 rounded text-xs text-muted bg-transparent border border-border cursor-pointer"
        >
          Dismiss signal
        </button>
      </div>
    );
  };

  const renderPositionsTab = () => {
    if (!positions.length) {
      return (
        <div className="text-center py-10 text-muted text-xs leading-loose">
          <div className="text-2xl opacity-15 mb-2">◫</div>
          No open positions
        </div>
      );
    }

    return positions.map((position, index) => {
      const color = position.dir === 'buy' ? 'text-green' : 'text-red';
      return (
        <div key={index} className="px-2 py-2 bg-surface rounded border border-border mb-1.5 text-xs">
          <div className="flex justify-between mb-1">
            <span className={`font-bold ${color}`}>
              {position.dir.toUpperCase()} {position.symbol}
            </span>
            <span className="font-mono text-xs text-muted">#{position.ticket}</span>
          </div>
          <div className="flex gap-2 font-mono text-xs text-dim">
            <span>@ {position.entry?.toFixed(d)}</span>
            <span className="text-red">SL {position.sl?.toFixed(d)}</span>
          </div>
          <div className="text-xs text-muted mt-1">
            {new Date(position.time).toLocaleTimeString()}
          </div>
        </div>
      );
    });
  };

  const renderBridgeTab = () => (
    <div className="flex flex-col gap-2 text-xs">
      <div className="text-dim text-xs leading-relaxed">
        Run the Python bridge locally to enable live MT5 execution.
      </div>
      
      <div>
        <div className="text-xs text-muted font-mono mb-1">BRIDGE URL</div>
        <div className="flex gap-1">
          <input
            value={mt5Url}
            onChange={(e) => setMt5Url(e.target.value)}
            className="flex-1 font-mono text-xs px-1.5 py-1 bg-surface border border-border rounded outline-none"
          />
          <button
            onClick={checkMT5}
            className="px-2 py-1 rounded bg-blue/20 border border-blue/40 text-blue text-xs cursor-pointer whitespace-nowrap"
          >
            Test
          </button>
        </div>
      </div>
      
      <div>
        <div className="text-xs text-muted font-mono mb-1">mt5_bridge.py</div>
        <div className="bg-background border border-border rounded p-2 text-xs font-mono text-dim overflow-x-auto max-h-48 overflow-y-auto leading-relaxed select-text">
          {BRIDGE_CODE}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(BRIDGE_CODE)}
          className="mt-1 w-full px-1 py-1 rounded bg-surface border border-border text-dim text-xs cursor-pointer"
        >
          Copy Code
        </button>
      </div>
      
      <div className="px-2 py-2 bg-gold/10 border border-gold/30 rounded text-xs text-gold leading-relaxed">
        1. pip install fastapi uvicorn MetaTrader5<br/>
        2. python mt5_bridge.py<br/>
        3. Click Test above
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

  return (
    <div className="w-48 flex-shrink-0 border-l border-border flex flex-col bg-panel">
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-1 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? 'text-cyan border-b-2 border-cyan'
                : 'text-muted border-b-2 border-transparent'
            }`}
          >
            {tabLabels[tab as keyof typeof tabLabels]}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {renderContent()}
      </div>
    </div>
  );
}
