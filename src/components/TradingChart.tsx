'use client';

import { useEffect, useRef } from 'react';

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  candles: any[];
  signal: any;
  chartContainerRef: React.RefObject<HTMLDivElement>;
}

export default function TradingChart({ 
  symbol, 
  timeframe, 
  candles, 
  signal, 
  chartContainerRef 
}: TradingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();

  const SYMBOLS = {
    XAUUSD: { d: 2 },
    EURUSD: { d: 5 },
    GBPUSD: { d: 5 },
    USDJPY: { d: 3 },
    BTCUSD: { d: 0 },
    NAS100: { d: 0 },
    US30: { d: 0 }
  };

  const drawChart = () => {
    const svg = svgRef.current;
    const container = chartContainerRef.current;
    if (!svg || !container || !candles.length) return;

    const W = container.clientWidth || 400;
    const H = container.clientHeight || 300;
    const PL = 54, PR = 8, PT = 10, PB = 6, VH = 36;
    const cw = W - PL - PR;
    const ph = H - PT - PB - VH - 8;
    
    const visible = candles.slice(-Math.min(candles.length, Math.floor(cw / 9)));
    const sp = cw / Math.max(visible.length, 1);
    const bw = Math.max(3, sp - 1.5);
    
    const prices = visible.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const maxV = Math.max(...visible.map(c => c.v), 1);
    
    const { d } = SYMBOLS[symbol as keyof typeof SYMBOLS] || SYMBOLS.XAUUSD;
    
    const toX = (i: number) => PL + i * sp + sp / 2;
    const toY = (p: number) => PT + ph - ((p - minP) / range) * ph;
    const toVY = (v: number) => PT + ph + 8 + VH - (v / maxV) * VH;
    
    const last = visible[visible.length - 1];
    let html = '';

    // Grid lines
    for (let i = 0; i <= 5; i++) {
      const p = minP + (i / 5) * range;
      const y = toY(p);
      html += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#182840" stroke-width="1"/>`;
      html += `<text x="${PL - 3}" y="${y + 3.5}" fill="#3a5568" font-size="9.5" text-anchor="end" font-family="Consolas,monospace">${p.toFixed(d)}</text>`;
    }
    
    html += `<line x1="${PL}" y1="${PT + ph + 8}" x2="${W - PR}" y2="${PT + ph + 8}" stroke="#182840" stroke-width="1"/>`;

    // Candles
    visible.forEach((candle, i) => {
      const x = PL + i * sp;
      const cx = x + sp / 2;
      const oY = toY(candle.o);
      const cY = toY(candle.c);
      const by = Math.min(oY, cY);
      const bh = Math.max(1, Math.abs(cY - oY));
      const color = candle.b ? '#00e07a' : '#ff3356';
      const vh2 = Math.max(1, (candle.v / maxV) * VH);
      
      html += `<line x1="${cx}" y1="${toY(candle.h)}" x2="${cx}" y2="${toY(candle.l)}" stroke="${color}" stroke-width="1" opacity="0.7"/>`;
      html += `<rect x="${x + 1}" y="${by}" width="${Math.max(2, bw - 2)}" height="${bh}" fill="${color}" opacity="0.85" rx="0.5"/>`;
      html += `<rect x="${x + 1}" y="${toVY(candle.v)}" width="${Math.max(2, bw - 2)}" height="${vh2}" fill="${color}" opacity="0.2"/>`;
    });

    // Signal lines
    if (signal && last) {
      const isBuy = signal.dir === 'buy';
      const color = isBuy ? '#00e07a' : '#ff3356';
      const lastIndex = visible.length - 1;
      const lastCx = toX(lastIndex);
      
      if (signal.tp) {
        const y = toY(signal.tp);
        html += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#00e07a" stroke-width="1" stroke-dasharray="5,3" opacity="0.55"/>`;
        html += `<text x="${W - PR - 4}" y="${y - 3}" fill="#00e07a" font-size="9" text-anchor="end" font-family="Consolas,monospace">TP ${signal.tp.toFixed(d)}</text>`;
      }
      
      if (signal.sl) {
        const y = toY(signal.sl);
        html += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#ff3356" stroke-width="1" stroke-dasharray="5,3" opacity="0.55"/>`;
        html += `<text x="${W - PR - 4}" y="${y + 11}" fill="#ff3356" font-size="9" text-anchor="end" font-family="Consolas,monospace">SL ${signal.sl.toFixed(d)}</text>`;
      }
      
      if (signal.entry) {
        const y = toY(signal.entry);
        html += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`;
      }
      
      const arrowY = isBuy ? toY(last.l) + 24 : toY(last.h) - 24;
      const arrowTip = isBuy ? arrowY - 13 : arrowY + 13;
      html += `<polygon points="${lastCx},${arrowTip} ${lastCx - 7},${arrowY} ${lastCx + 7},${arrowY}" fill="${color}" opacity="0.95"/>`;
    }

    // Current price line
    if (last) {
      const ly = toY(last.c);
      html += `<line x1="${PL}" y1="${ly}" x2="${W - PR}" y2="${ly}" stroke="white" stroke-width="0.5" stroke-dasharray="2,6" opacity="0.2"/>`;
    }

    svg.innerHTML = html;
  };

  useEffect(() => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      drawChart();
    });

    if (chartContainerRef.current) {
      resizeObserverRef.current.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [chartContainerRef]);

  useEffect(() => {
    drawChart();
  }, [candles, signal, symbol]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="px-2.5 py-1.5 border-b border-border flex gap-2.5 items-center font-mono text-xs text-muted flex-shrink-0 overflow-hidden">
        <span className="text-text font-semibold">{symbol}</span>
        <span>{timeframe}</span>
      </div>
      
      <div 
        ref={chartContainerRef}
        className="flex-1 relative overflow-hidden min-h-0"
      >
        <svg 
          ref={svgRef}
          className="block w-full h-full absolute top-0 left-0"
        />
      </div>
    </div>
  );
}
