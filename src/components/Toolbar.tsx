'use client';

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
  const timeframes = ['5M', '15M', '30M', '1H', '2H'];
  const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'NAS100', 'US30'];

  const getLastPrice = () => {
    if (!candles.length) return '3120.50';
    const last = candles[candles.length - 1];
    return last.c.toFixed(2);
  };

  const getPriceChange = () => {
    if (!candles.length) return '+0.00%';
    const change = ((candles[candles.length - 1].c - candles[0].o) / candles[0].o * 100);
    return (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  };

  const getPriceChangeColor = () => {
    if (!candles.length) return 'text-green';
    const change = ((candles[candles.length - 1].c - candles[0].o) / candles[0].o * 100);
    return change >= 0 ? 'text-green' : 'text-red';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-panel bg-panel flex-shrink-0 h-9 flex-wrap">
      <span className="font-bold text-cyan text-sm tracking-wider flex-shrink-0">⬡ NEURAL</span>
      
      <select 
        value={symbol} 
        onChange={(e) => setSymbol(e.target.value)}
        className="bg-surface border border-border text-text px-2 py-1 rounded text-xs cursor-pointer outline-none"
      >
        {symbols.map(sym => (
          <option key={sym} value={sym}>{sym}</option>
        ))}
      </select>

      <div className="flex gap-0.5 flex-shrink-0">
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-1.5 py-0.5 rounded font-mono text-xs transition-colors ${
              timeframe === tf 
                ? 'bg-blue text-white opacity-80' 
                : 'text-muted hover:text-text'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <span className="font-mono text-sm font-semibold ml-auto whitespace-nowrap">
        {getLastPrice()}
      </span>
      
      <span className={`font-mono text-xs whitespace-nowrap ${getPriceChangeColor()}`}>
        {getPriceChange()}
      </span>

      <div 
        onClick={checkMT5}
        className={`flex items-center gap-1 px-2 py-0.5 border rounded cursor-pointer flex-shrink-0 transition-colors ${
          mt5Online 
            ? 'border-green/20 bg-green/10' 
            : 'border-red/20 bg-red/10'
        }`}
      >
        <div 
          className={`w-1 h-1 rounded-full flex-shrink-0 ${
            mt5Online ? 'bg-green' : 'bg-red'
          }`}
        />
        <span 
          className={`font-mono text-xs whitespace-nowrap ${
            mt5Online ? 'text-green' : 'text-red'
          }`}
        >
          MT5 {mt5Online ? 'online' : 'offline'}
        </span>
      </div>
    </div>
  );
}
