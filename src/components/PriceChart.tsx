'use client';

import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  type AutoscaleInfo,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { TradeSignal } from '@/lib/signal';
import { SYMBOLS } from '@/lib/symbols';
import { CHART_COLORS, type Theme } from '@/lib/theme';
import type { Candle, SymbolId, Timeframe } from '@/lib/types';

interface Props {
  symbol: SymbolId;
  timeframe: Timeframe;
  candles: Candle[];
  /** Only drawn when it belongs to `symbol`. */
  signal: TradeSignal | null;
  theme: Theme;
}

export default function PriceChart({ symbol, timeframe, candles, signal, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const levelsRef = useRef<number[]>([]);
  const fittedKeyRef = useRef<string | null>(null);

  // Create once; autoSize keeps it matched to the container (including when it's shown after being hidden).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: 11,
        attributionLogo: false,
      },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 4 },
      crosshair: { mode: CrosshairMode.Normal },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      // Keep signal levels in view even when they sit outside the visible bars.
      autoscaleInfoProvider: (base: () => AutoscaleInfo | null) => {
        const res = base();
        if (res?.priceRange && levelsRef.current.length) {
          res.priceRange.minValue = Math.min(res.priceRange.minValue, ...levelsRef.current);
          res.priceRange.maxValue = Math.max(res.priceRange.maxValue, ...levelsRef.current);
        }
        return res;
      },
    });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceScaleId: '', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    return () => {
      chart.remove();
      chartRef.current = candleRef.current = volumeRef.current = null;
      linesRef.current = [];
    };
  }, []);

  // Theme.
  useEffect(() => {
    const c = CHART_COLORS[theme];
    chartRef.current?.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
      crosshair: { vertLine: { color: c.crosshair, labelBackgroundColor: c.crosshair }, horzLine: { color: c.crosshair, labelBackgroundColor: c.crosshair } },
    });
    candleRef.current?.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down });
  }, [theme]);

  // Price precision per symbol.
  useEffect(() => {
    const digits = SYMBOLS[symbol].digits;
    candleRef.current?.applyOptions({ priceFormat: { type: 'price', precision: digits, minMove: 1 / 10 ** digits } });
  }, [symbol]);

  // Data.
  useEffect(() => {
    const candleSeries = candleRef.current, volumeSeries = volumeRef.current;
    if (!candleSeries || !volumeSeries) return;
    const c = CHART_COLORS[theme];
    candleSeries.setData(candles.map((b) => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close })));
    volumeSeries.setData(candles.map((b) => ({ time: b.time as UTCTimestamp, value: b.volume, color: b.close >= b.open ? c.upVolume : c.downVolume })));
    // Reset the view when switching symbol/timeframe, not on every refresh.
    const key = candles.length ? `${symbol}:${timeframe}` : null;
    if (key && fittedKeyRef.current !== key) {
      chartRef.current?.timeScale().fitContent();
      fittedKeyRef.current = key;
    }
  }, [candles, symbol, timeframe, theme]);

  // Signal levels.
  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    linesRef.current.forEach((l) => series.removePriceLine(l));
    linesRef.current = [];
    levelsRef.current = [];
    if (!signal || signal.symbol !== symbol) return;
    const c = CHART_COLORS[theme];
    linesRef.current = [
      series.createPriceLine({ price: signal.entry, color: signal.side === 'buy' ? c.up : c.down, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'Entry' }),
      series.createPriceLine({ price: signal.stopLoss, color: c.down, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Stop' }),
      series.createPriceLine({ price: signal.takeProfit, color: c.up, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Target' }),
    ];
    levelsRef.current = [signal.entry, signal.stopLoss, signal.takeProfit];
  }, [signal, symbol, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
